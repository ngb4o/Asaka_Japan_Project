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
const MAX_HISTORY = 8
const MAX_MSG_CHARS = 1500
const MAX_TOOL_RESULT_CHARS = 3500
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

const streamTokens = (res, text) => {
  if (!text) return
  const chunkSize = 48
  for (let i = 0; i < text.length; i += chunkSize) {
    sseWrite(res, 'token', { text: text.slice(i, i + chunkSize) })
  }
}

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

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      sseWrite(res, 'status', { phase: 'thinking', round })

      const completion = await createCompletion(openaiMessages, { withTools: true })

      const message = completion.choices?.[0]?.message
      if (!message) break

      const toolCalls = message.tool_calls || []

      if (!toolCalls.length) {
        assistantText = message.content || ''
        streamTokens(res, assistantText)
        break
      }

      openaiMessages.push({
        role: 'assistant',
        content: message.content || null,
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
          openaiMessages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: compactToolPayload(
              result.ok ? { data: result.data } : { error: result.error }
            )
          })
        }
      }

      if (pendingEmitted) {
        const wrapUp = await createCompletion(openaiMessages, { withTools: false })
        assistantText = wrapUp.choices?.[0]?.message?.content || ''
        streamTokens(res, assistantText)
        break
      }
    }

    if (!assistantText && !pendingEmitted) {
      // Last round ended on tools without final text — ask once more without tools
      const wrapUp = await createCompletion(openaiMessages, { withTools: false })
      assistantText = wrapUp.choices?.[0]?.message?.content || ''
      streamTokens(res, assistantText)
    }
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw mapGroqError(err)
  }

  sseWrite(res, 'done', {
    content: assistantText,
    pending: pendingEmitted
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
