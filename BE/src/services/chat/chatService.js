import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  createChatCompletionWithFallback,
  mapGroqError
} from '~/services/chat/groqClient'
import { buildSystemPrompt } from '~/services/chat/systemPrompt'
import {
  getToolsForRoles,
  toOpenAITools,
  runChatTool
} from '~/services/chat/toolRegistry'
import {
  consumePendingAction,
  cancelPendingAction
} from '~/services/chat/pendingActions'

const MAX_TOOL_ROUNDS = 4
const MAX_HISTORY = 24
const MAX_MSG_CHARS = 2000
const MAX_TOOL_RESULT_CHARS = 3500
const MAX_DIGEST_CHARS = 1200
const RATE_WINDOW_MS = 60 * 1000
const RATE_MAX = 30
const rateMap = new Map()

const assertRateLimit = (userId) => {
  const now = Date.now()
  const key = String(userId)
  let bucket = rateMap.get(key)
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS }
    rateMap.set(key, bucket)
  }
  bucket.count += 1
  if (bucket.count > RATE_MAX) {
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      'Bạn gửi quá nhiều tin nhắn. Thử lại sau một phút.'
    )
  }
}

const sseWrite = (res, event, data) => {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

const normalizeHistory = (messages = []) => {
  const cleaned = []
  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') continue
    if (msg.role !== 'user' && msg.role !== 'assistant') continue
    const content = String(msg.content || '').trim()
    if (!content) continue
    cleaned.push({ role: msg.role, content: content.slice(0, MAX_MSG_CHARS) })
  }
  return cleaned.slice(-MAX_HISTORY)
}

const compactToolPayload = (payload) => {
  const text = JSON.stringify(payload)
  if (text.length <= MAX_TOOL_RESULT_CHARS) return text
  return `${text.slice(0, MAX_TOOL_RESULT_CHARS)}…[truncated]`
}

const pickEntityLine = (item) => {
  if (!item || typeof item !== 'object') return null
  const id = item._id || item.id
  const code = item.code || item.orderCode || item.tripCode
  const name =
    item.name ||
    item.dealerName ||
    item.productName ||
    item.title ||
    item.fullName ||
    item.employeeName
  const parts = []
  if (code) parts.push(String(code))
  if (name) parts.push(String(name))
  if (id) parts.push(`id=${String(id)}`)
  if (!parts.length) return null
  return parts.join(' · ')
}

/**
 * Compact refs from tool data so follow-up turns keep IDs/codes
 * (client stores this and re-sends as historyExtra).
 */
const buildContextDigest = (toolName, data) => {
  if (!data || typeof data !== 'object') return null
  const lines = []

  const pushItem = (item, idx) => {
    const line = pickEntityLine(item)
    if (line) lines.push(`${idx + 1}. ${line}`)
  }

  if (Array.isArray(data.items) && data.items.length) {
    data.items.slice(0, 8).forEach(pushItem)
  } else if (data.item) {
    pushItem(data.item, 0)
  } else if (data.order || data.trip || data.dealer || data.lead || data.product) {
    const entity =
      data.order || data.trip || data.dealer || data.lead || data.product
    pushItem(entity, 0)
  } else {
    const line = pickEntityLine(data)
    if (line) lines.push(line)
  }

  if (data.topItem) {
    const line = pickEntityLine(data.topItem)
    if (line) lines.push(`top: ${line}`)
  }
  if (data.topTrip) {
    const line = pickEntityLine(data.topTrip)
    if (line) lines.push(`topTrip: ${line}`)
  }
  if (data.topDebtor) {
    const line = pickEntityLine(data.topDebtor)
    if (line) lines.push(`topDebtor: ${line}`)
  }

  if (!lines.length) return null
  const body = lines.join('\n')
  const text = `[Ngữ cảnh ${toolName}]\n${body}`
  return text.length > MAX_DIGEST_CHARS
    ? `${text.slice(0, MAX_DIGEST_CHARS)}…`
    : text
}

const streamTokens = (res, text) => {
  if (!text) return
  const chunkSize = 48
  for (let i = 0; i < text.length; i += chunkSize) {
    sseWrite(res, 'token', { text: text.slice(i, i + chunkSize) })
  }
}

/**
 * Some Groq/Llama models leak tool calls as plain text instead of
 * native tool_calls, e.g. <function=query_crm>{...}</function>
 */
const parseTextToolCalls = (content) => {
  const text = String(content || '')
  if (!text.includes('<function') && !text.includes('tool_call')) {
    return []
  }

  const calls = []
  const patterns = [
    /<function\s*=\s*([a-zA-Z0-9_]+)>\s*([\s\S]*?)\s*<\/function>/gi,
    /<function\s*=\s*([a-zA-Z0-9_]+)\{([\s\S]*?)\}\s*(?:<\/function>)?/gi,
    /<tool_call>\s*(?:name[=:]\s*)?([a-zA-Z0-9_]+)\s*([\s\S]*?)<\/tool_call>/gi
  ]

  for (const pattern of patterns) {
    pattern.lastIndex = 0
    let match = pattern.exec(text)
    while (match) {
      const name = String(match[1] || '').trim()
      let argsRaw = String(match[2] || '').trim()
      if (!name) {
        match = pattern.exec(text)
        continue
      }
      if (!argsRaw) argsRaw = '{}'
      if (!argsRaw.startsWith('{') && !argsRaw.startsWith('[')) {
        const jsonMatch = argsRaw.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
        argsRaw = jsonMatch ? jsonMatch[0] : '{}'
      }
      try {
        JSON.parse(argsRaw)
      } catch {
        argsRaw = '{}'
      }
      calls.push({
        id: `call_text_${Date.now()}_${calls.length}`,
        type: 'function',
        function: { name, arguments: argsRaw }
      })
      match = pattern.exec(text)
    }
    if (calls.length) break
  }

  return calls
}

const stripToolMarkup = (content) =>
  String(content || '')
    .replace(/<function\s*=\s*[a-zA-Z0-9_]+>[\s\S]*?<\/function>/gi, '')
    .replace(/<function\s*=\s*[a-zA-Z0-9_]+\{[\s\S]*?\}\s*(?:<\/function>)?/gi, '')
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const looksLikeLeakedToolCall = (content) =>
  /<function\s*=|<tool_call>/i.test(String(content || ''))

/**
 * Stream a chat turn over SSE (Groq / OpenAI-compatible).
 */
const streamMessage = async ({ res, userId, roles, messages, clientMessage }) => {
  assertRateLimit(userId)

  const history = normalizeHistory(messages)
  const userText = String(clientMessage || '').trim()
  if (!userText) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Tin nhắn trống.')
  }
  history.push({ role: 'user', content: userText.slice(0, MAX_MSG_CHARS) })

  const allowedTools = getToolsForRoles(roles)
  const tools = toOpenAITools(allowedTools)
  const userCtx = { userId, roles }
  const openaiMessages = [
    { role: 'system', content: buildSystemPrompt(roles) },
    ...history
  ]

  let pendingEmitted = null
  let assistantText = ''
  const digestParts = []

  try {
    const createCompletion = (messages, { withTools = true } = {}) =>
      createChatCompletionWithFallback(
        {
          messages,
          tools: withTools && tools.length ? tools : undefined,
          tool_choice: withTools && tools.length ? 'auto' : undefined,
          temperature: 0.2
        },
        {
          onModelSwitch: ({ from, to }) => {
            sseWrite(res, 'status', {
              phase: 'model_fallback',
              from,
              to,
              message: `Hết hạn mức ${from}, chuyển sang ${to}…`
            })
          }
        }
      )

    const runToolCalls = async (toolCalls) => {
      openaiMessages.push({
        role: 'assistant',
        content: null,
        tool_calls: toolCalls
      })

      for (const call of toolCalls) {
        const name = call.function?.name
        const argStr = call.function?.arguments || '{}'
        sseWrite(res, 'tool_start', { name, id: call.id })

        const started = Date.now()
        const result = await runChatTool(name, argStr, userCtx)
        // eslint-disable-next-line no-console
        console.info('[chat-tool]', {
          userId,
          name,
          ms: Date.now() - started,
          ok: result.ok,
          pending: Boolean(result.pending),
          error: result.error || undefined,
          itemCount: Array.isArray(result.data?.items)
            ? result.data.items.length
            : undefined,
          topDebtor: result.data?.topDebtor?.dealerName
        })

        if (result.pending) {
          pendingEmitted = {
            token: result.token,
            toolName: result.toolName,
            preview: result.preview,
            expiresAt: result.expiresAt
          }
          sseWrite(res, 'pending_confirmation', pendingEmitted)
          sseWrite(res, 'tool_result', {
            name,
            ok: true,
            pending: true,
            preview: result.preview
          })

          openaiMessages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify({
              status: 'awaiting_user_confirmation',
              preview: result.preview,
              message:
                'Thao tác đã được chuẩn bị. Người dùng phải bấm Xác nhận trên UI. Hãy nói ngắn gọn rằng đã sẵn sàng chờ xác nhận, không nói đã hoàn tất.'
            })
          })
        } else {
          sseWrite(res, 'tool_result', {
            name,
            ok: result.ok,
            error: result.error || null
          })
          if (result.ok && result.data) {
            const digest = buildContextDigest(name, result.data)
            if (digest) digestParts.push(digest)
          }
          openaiMessages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: compactToolPayload(
              result.ok ? { data: result.data } : { error: result.error }
            )
          })
        }
      }
    }

    const finalizeAssistantText = async (rawText) => {
      let text = stripToolMarkup(rawText || '')
      // Model still tried to emit tools as text after wrap-up — ask once more
      if (!text && looksLikeLeakedToolCall(rawText)) {
        openaiMessages.push({
          role: 'system',
          content:
            'Không được in thẻ <function=...>. Chỉ trả lời tiếng Việt dựa trên kết quả tool đã có.'
        })
        const retry = await createCompletion(openaiMessages, { withTools: false })
        text = stripToolMarkup(retry.choices?.[0]?.message?.content || '')
      }
      return text
    }

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      sseWrite(res, 'status', { phase: 'thinking', round })

      const completion = await createCompletion(openaiMessages, { withTools: true })

      const message = completion.choices?.[0]?.message
      if (!message) break

      let toolCalls = message.tool_calls || []
      if (!toolCalls.length) {
        const parsed = parseTextToolCalls(message.content)
        if (parsed.length) {
          // eslint-disable-next-line no-console
          console.info('[chat-text-tool-calls]', {
            userId,
            count: parsed.length,
            names: parsed.map((c) => c.function?.name)
          })
          toolCalls = parsed
        }
      }

      if (!toolCalls.length) {
        assistantText = await finalizeAssistantText(message.content || '')
        streamTokens(res, assistantText)
        break
      }

      await runToolCalls(toolCalls)

      if (pendingEmitted) {
        const wrapUp = await createCompletion(openaiMessages, { withTools: false })
        assistantText = await finalizeAssistantText(
          wrapUp.choices?.[0]?.message?.content || ''
        )
        streamTokens(res, assistantText)
        break
      }
    }

    if (!assistantText && !pendingEmitted) {
      // Last round ended on tools without final text — ask once more without tools
      const wrapUp = await createCompletion(openaiMessages, { withTools: false })
      assistantText = await finalizeAssistantText(
        wrapUp.choices?.[0]?.message?.content || ''
      )
      streamTokens(res, assistantText)
    }
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw mapGroqError(err)
  }

  // Never leak raw function markup to the client
  assistantText = stripToolMarkup(assistantText)
  if (!assistantText && !pendingEmitted) {
    assistantText =
      'Xin lỗi, mình chưa lấy được dữ liệu. Bạn thử hỏi lại cụ thể hơn nhé.'
  }

  let contextDigest = digestParts.length
    ? digestParts.join('\n')
    : null
  if (contextDigest && contextDigest.length > MAX_DIGEST_CHARS) {
    contextDigest = `${contextDigest.slice(0, MAX_DIGEST_CHARS)}…`
  }

  sseWrite(res, 'done', {
    content: assistantText,
    pending: pendingEmitted,
    contextDigest
  })
}

const confirmAction = async ({ userId, token, accept }) => {
  if (!token) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Thiếu token xác nhận.')
  }

  if (!accept) {
    const cancelled = cancelPendingAction(token, userId)
    if (!cancelled) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Không tìm thấy thao tác chờ xác nhận (có thể đã hết hạn).'
      )
    }
    return {
      cancelled: true,
      message: 'Đã hủy thao tác.'
    }
  }

  const pending = consumePendingAction(token, userId)
  if (!pending) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Không tìm thấy thao tác chờ xác nhận (có thể đã hết hạn).'
    )
  }

  try {
    const data = await pending.execute()
    // eslint-disable-next-line no-console
    console.info('[chat-confirm]', {
      userId,
      toolName: pending.toolName,
      ok: true
    })
    return {
      cancelled: false,
      toolName: pending.toolName,
      preview: pending.preview,
      data,
      message: `Đã thực hiện: ${pending.preview}`
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.info('[chat-confirm]', {
      userId,
      toolName: pending.toolName,
      ok: false,
      error: err?.message
    })
    throw err
  }
}

export const chatService = {
  streamMessage,
  confirmAction,
  sseWrite
}
