import OpenAI from 'openai'
import { StatusCodes } from 'http-status-codes'
import { env } from '~/config/environment'
import ApiError from '~/utils/ApiError'

let client = null

/** Models known exhausted (rate limit) until expiresAt */
const exhaustedUntil = new Map()

const DEFAULT_MODEL_CHAIN = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'qwen/qwen3.6-27b'
]

export const getGroqClient = () => {
  if (!env.GROQ_API_KEY) {
    throw new ApiError(
      StatusCodes.SERVICE_UNAVAILABLE,
      'Chatbot chưa được cấu hình (thiếu GROQ_API_KEY). Lấy key miễn phí tại https://console.groq.com/keys'
    )
  }
  if (!client) {
    client = new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1'
    })
  }
  return client
}

export const getGroqModel = () =>
  env.GROQ_MODEL || 'llama-3.1-8b-instant'

/** Preferred model first, then fallbacks (unique). */
export const getGroqModelChain = () => {
  const primary = getGroqModel()
  const fromEnv = String(env.GROQ_MODEL_FALLBACKS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const chain = [primary, ...fromEnv, ...DEFAULT_MODEL_CHAIN]
  const unique = []
  for (const model of chain) {
    if (model && !unique.includes(model)) unique.push(model)
  }
  return unique
}

export const isRateLimitError = (err) => {
  const status = err?.status || err?.statusCode
  const message = err?.message || String(err)
  return (
    status === 429 ||
    status === 413 ||
    /rate.?limit|quota|too many requests|tokens per (day|minute)|TPD|TPM|RPD|request too large|limit.?reached|reduce your message size/i.test(
      message
    )
  )
}

/** Payload/TPM overflow — try next model, don't blacklist current for 30m. */
export const isPayloadTooLargeError = (err) => {
  const status = err?.status || err?.statusCode
  const message = err?.message || String(err)
  return (
    status === 413 ||
    /request too large|reduce your message size|Requested \d+/i.test(message)
  )
}

const markExhausted = (model, err) => {
  // Prefer retry-after header if present; else skip model for 30 minutes
  const retryAfterSec = Number(err?.headers?.['retry-after'] || 0)
  const ttlMs = retryAfterSec > 0 ? retryAfterSec * 1000 : 30 * 60 * 1000
  exhaustedUntil.set(model, Date.now() + ttlMs)
}

const isExhausted = (model) => {
  const until = exhaustedUntil.get(model)
  if (!until) return false
  if (until <= Date.now()) {
    exhaustedUntil.delete(model)
    return false
  }
  return true
}

export const isToolCallGenerationError = (err) => {
  const status = err?.status || err?.statusCode
  const message = err?.message || String(err)
  return (
    status === 400 &&
    /failed_generation|Failed to call a function|tool call validation failed|adjust your prompt/i.test(
      message
    )
  )
}

/**
 * Call Groq chat.completions; on daily/minute rate limit, try next model.
 */
export const createChatCompletionWithFallback = async (params, { onModelSwitch } = {}) => {
  const client = getGroqClient()
  const chain = getGroqModelChain().filter((model) => !isExhausted(model))
  if (!chain.length) {
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      'Tất cả model Groq free trong danh sách đều hết hạn mức tạm thời. Thử lại sau.'
    )
  }

  let lastError = null
  for (let i = 0; i < chain.length; i += 1) {
    const model = chain[i]
    try {
      return await client.chat.completions.create({
        ...params,
        model
      })
    } catch (err) {
      lastError = err
      const canFallback =
        isRateLimitError(err) || isToolCallGenerationError(err)
      if (!canFallback) throw err

      // Tool-call generation failures: retry next model, don't blacklist
      if (!isToolCallGenerationError(err) && !isPayloadTooLargeError(err)) {
        markExhausted(model, err)
      }

      const next = chain[i + 1]
      // eslint-disable-next-line no-console
      console.info('[chat-model-fallback]', {
        from: model,
        to: next || null,
        reason: err?.message?.slice?.(0, 160)
      })
      if (next && onModelSwitch) {
        onModelSwitch({ from: model, to: next })
      }

      // Last resort for failed tool JSON: retry once without tools on same model
      if (!next && isToolCallGenerationError(err) && params.tools) {
        try {
          return await client.chat.completions.create({
            ...params,
            model,
            tools: undefined,
            tool_choice: undefined,
            messages: [
              ...params.messages,
              {
                role: 'system',
                content:
                  'Lần gọi tool trước bị lỗi JSON. Hãy trả lời ngắn: yêu cầu user hỏi lại cụ thể hơn, hoặc mô tả cần tool nào (không bịa số liệu).'
              }
            ]
          })
        } catch (err2) {
          lastError = err2
        }
      }
    }
  }

  throw lastError
}

export const mapGroqError = (err) => {
  const message = err?.message || String(err)
  const detail = message.replace(/\s+/g, ' ').slice(0, 220)
  const status = err?.status || err?.statusCode

  if (status === 401 || /invalid.?api.?key|Incorrect API key/i.test(message)) {
    return new ApiError(
      StatusCodes.SERVICE_UNAVAILABLE,
      `GROQ_API_KEY không hợp lệ. Lấy lại tại https://console.groq.com/keys — ${detail}`
    )
  }
  if (isRateLimitError(err)) {
    return new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      `Groq hết hạn mức trên mọi model fallback. Đợi reset rồi thử lại. — ${detail}`
    )
  }
  return new ApiError(
    StatusCodes.BAD_GATEWAY,
    `Lỗi Groq: ${detail || 'không xác định'}`
  )
}
