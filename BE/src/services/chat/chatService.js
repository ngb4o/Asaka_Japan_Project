import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  createChatCompletionWithFallback,
  createVisionCompletionWithFallback,
  mapGroqError
} from '~/services/chat/groqClient'
import { resolveVisionImage } from '~/services/chat/visionImage'
import {
  buildSystemPrompt,
  buildVisionProductPrompt
} from '~/services/chat/systemPrompt'
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

/** User asks for CRM facts / has business codes → prefer tool use. */
const needsCrmTool = (text) =>
  /\b(?:O|CT)-[A-Z0-9-]+/i.test(text) ||
  /(đơn hàng|chuyến|công nợ|tạm ứng|tồn kho|doanh thu|báo cáo|đại lý|nhà cung cấp|\bNCC\b|lương|phiếu mua|xuất kho|nhập kho|còn nợ|đề xuất.*(chuyến|giao|đi))/i.test(
    text
  )

const extractOrderCodes = (text) => [
  ...new Set(
    [...String(text || '').matchAll(/\b(O-\d{8}-\d+)\b/gi)].map((m) =>
      m[1].toUpperCase()
    )
  )
]

const extractTripCodes = (text) => [
  ...new Set(
    [...String(text || '').matchAll(/\b(CT-\d{8}-\d+)\b/gi)].map((m) =>
      m[1].toUpperCase()
    )
  )
]

const looksLikeRefusal = (text) =>
  /không thể giúp|không thể thực hiện|không có quyền truy cập|chỉ có thể truy cập thông qua|không truy cập trực tiếp|i('| a)?m sorry.*can('| no)t help|i cannot (help|assist)|unable to (help|assist|fulfill)|against my (guidelines|programming)/i.test(
    String(text || '')
  )

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
  if (data.periodLabel || data.kpis) {
    const k = data.kpis || {}
    lines.push(
      [
        data.periodLabel || 'kỳ',
        data.empty ? 'empty' : null,
        k.orderCount != null ? `đơn=${k.orderCount}` : null,
        k.revenue != null ? `DT=${k.revenue}` : null,
        k.completedCount != null ? `xong=${k.completedCount}` : null,
        k.completedRevenue != null ? `DT_xong=${k.completedRevenue}` : null
      ]
        .filter(Boolean)
        .join(' · ')
    )
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
const streamMessage = async ({
  res,
  userId,
  roles,
  messages,
  clientMessage,
  imageUrl
}) => {
  assertRateLimit(userId)

  const history = normalizeHistory(messages)
  const userText = String(clientMessage || '').trim()
  const hasImage = Boolean(String(imageUrl || '').trim())
  if (!userText && !hasImage) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Tin nhắn trống.')
  }

  let vision = null
  if (hasImage) {
    vision = await resolveVisionImage(imageUrl)
    const caption = userText.slice(0, MAX_MSG_CHARS) ||
      'Thêm sản phẩm từ ảnh bao bì này. Đọc nhãn rồi đề xuất tạo sản phẩm (chờ xác nhận).'
    history.push({
      role: 'user',
      content: [
        { type: 'text', text: caption },
        { type: 'image_url', image_url: { url: vision.visionUrl } }
      ]
    })
  } else {
    history.push({ role: 'user', content: userText.slice(0, MAX_MSG_CHARS) })
  }

  const allowedTools = getToolsForRoles(roles)
  const visionToolNames = [
    'search_products',
    'get_product',
    'search_product_categories',
    'create_product'
  ]
  const tools = toOpenAITools(
    vision
      ? allowedTools.filter((tool) => visionToolNames.includes(tool.name))
      : allowedTools
  )
  const userCtx = {
    userId,
    roles,
    imageUrl: vision?.storeUrl || null
  }
  const openaiMessages = [
    {
      role: 'system',
      content: vision ? buildVisionProductPrompt(roles) : buildSystemPrompt(roles)
    },
    ...(vision ? history.slice(-4) : history)
  ]

  let pendingEmitted = null
  let assistantText = ''
  const digestParts = []
  const forceToolsFirstRound = needsCrmTool(userText) || Boolean(vision)
  let syntheticToolSeq = 0

  const pushSyntheticToolResult = (name, result) => {
    syntheticToolSeq += 1
    const callId = `prefetch_${name}_${syntheticToolSeq}`
    sseWrite(res, 'tool_start', { name, id: callId, prefetch: true })
    sseWrite(res, 'tool_result', {
      name,
      ok: result.ok,
      error: result.error || null,
      prefetch: true
    })
    openaiMessages.push({
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: callId,
          type: 'function',
          function: {
            name,
            arguments: '{}'
          }
        }
      ]
    })
    openaiMessages.push({
      role: 'tool',
      tool_call_id: callId,
      content: compactToolPayload(
        result.ok ? { data: result.data } : { error: result.error }
      )
    })
    if (result.ok && result.data) {
      const digest = buildContextDigest(name, result.data)
      if (digest) digestParts.push(digest)
    }
  }

  try {
    // Prefetch by business codes so the model never "refuses DB access"
    const orderCodes = extractOrderCodes(userText)
    const tripCodes = extractTripCodes(userText)
    for (const code of orderCodes) {
      sseWrite(res, 'status', {
        phase: 'prefetch',
        message: `Đang lấy đơn ${code} từ CRM…`
      })
      const orderResult = await runChatTool('get_order', { orderId: code }, userCtx)
      pushSyntheticToolResult('get_order', orderResult)
      if (orderResult.ok && orderResult.data) {
        const orderId = String(
          orderResult.data.id || orderResult.data._id || ''
        )
        if (orderId) {
          const tripsResult = await runChatTool(
            'query_crm',
            {
              collection: 'trips',
              operation: 'find',
              filter: {
                $or: [
                  { orderIds: orderId },
                  { orderIds: { $in: [orderId] } }
                ]
              },
              projection: {
                code: 1,
                status: 1,
                region: 1,
                title: 1,
                startDate: 1,
                endDate: 1,
                orderIds: 1,
                memberIds: 1
              },
              limit: 10
            },
            userCtx
          )
          pushSyntheticToolResult('query_crm', tripsResult)
        }
      }
    }
    for (const code of tripCodes) {
      sseWrite(res, 'status', {
        phase: 'prefetch',
        message: `Đang lấy chuyến ${code} từ CRM…`
      })
      const tripResult = await runChatTool('get_trip', { tripId: code }, userCtx)
      pushSyntheticToolResult('get_trip', tripResult)
    }
    if (orderCodes.length || tripCodes.length) {
      openaiMessages.push({
        role: 'system',
        content:
          'User là nhân viên CRM đã đăng nhập. Dữ liệu đơn/chuyến ở trên đã lấy HỢP LỆ qua tool. Trả lời tiếng Việt dựa trên data đó: địa chỉ giao, đại lý, chuyến CT gắn đơn (nếu có). KHÔNG từ chối, KHÔNG bịa.'
      })
    }

    if (vision) {
      sseWrite(res, 'status', {
        phase: 'prefetch',
        message: 'Đang lấy danh mục sản phẩm…'
      })
      const categoriesResult = await runChatTool(
        'search_product_categories',
        { limit: 50 },
        userCtx
      )
      const categoryLines = (categoriesResult.data?.items || [])
        .slice(0, 30)
        .map((item) => `${item.name}=${item.id || item._id}`)
        .filter((line) => !line.endsWith('='))
        .join('; ')
      openaiMessages.push({
        role: 'system',
        content: [
          `Ảnh đã upload, create_product phải có image="${vision.storeUrl}".`,
          categoryLines
            ? `Loại SP (dùng đúng id): ${categoryLines}.`
            : 'Chưa có loại SP — mô tả nhãn, đừng tạo.',
          'search_products rồi create_product. Bắt buộc shortDescription + description (markdown từ nhãn). Giá không rõ = 0.'
        ].join(' ')
      })
    }

    const runCompletion = vision
      ? createVisionCompletionWithFallback
      : createChatCompletionWithFallback

    const createCompletion = (
      messages,
      { withTools = true, forceTool = false } = {}
    ) =>
      runCompletion(
        {
          messages,
          tools: withTools && tools.length ? tools : undefined,
          tool_choice:
            withTools && tools.length
              ? forceTool
                ? 'required'
                : 'auto'
              : undefined,
          temperature: 0.1
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

      const completion = await createCompletion(openaiMessages, {
        withTools: true,
        // Already prefetched codes → don't force tool_choice=required (model may refuse)
        forceTool:
          (Boolean(vision) && round === 0) ||
          (forceToolsFirstRound &&
            round === 0 &&
            digestParts.length === 0 &&
            !orderCodes.length &&
            !tripCodes.length)
      })

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
        // CRM question answered without tools → one forced retry
        if (forceToolsFirstRound && digestParts.length === 0 && round === 0) {
          openaiMessages.push({
            role: 'system',
            content:
              'Bạn là trợ lý CRM nội bộ đã được cấp quyền. BẮT BUỘC gọi tool get_order / get_trip / query_crm. Không từ chối. Không bịa số liệu.'
          })
          continue
        }
        assistantText = await finalizeAssistantText(message.content || '')
        // Wrong refusal / "no DB access" → rewrite once
        if (looksLikeRefusal(assistantText)) {
          openaiMessages.push({
            role: 'assistant',
            content: assistantText
          })
          openaiMessages.push({
            role: 'system',
            content: digestParts.length
              ? 'Câu từ chối ở trên SAI. User là nhân viên CRM. Hãy trả lời lại bằng dữ liệu tool đã có. Không xin lỗi, không từ chối.'
              : 'Câu trả lời ở trên SAI. User là nhân viên CRM đã đăng nhập. Bạn CÓ quyền đọc toàn bộ database nghiệp vụ qua query_crm + describe_crm_schema. Trả lời lại: có quyền đọc mọi bảng CRM; giới hạn là chỉ đọc (ghi cần xác nhận), tối đa 50 dòng/lần.'
          })
          const retry = await createCompletion(openaiMessages, {
            withTools: false
          })
          assistantText = await finalizeAssistantText(
            retry.choices?.[0]?.message?.content || ''
          )
        }
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
