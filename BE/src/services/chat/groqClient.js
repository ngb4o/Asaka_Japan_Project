import OpenAI from 'openai'
import { StatusCodes } from 'http-status-codes'
import { env } from '~/config/environment'
import ApiError from '~/utils/ApiError'

let client = null

/**
 * Models known exhausted (rate limit) until expiresAt (ms).
 * When TTL ends → model returns to the front of the chain automatically.
 */
const exhaustedUntil = new Map()

/**
 * Ưu tiên: thông minh nhất trước, rồi model nhanh + hạn mức ngày cao.
 * Free tier (org limits): 70b = 1K RPD; 8b-instant = 14.4K RPD.
 */
const DEFAULT_MODEL_CHAIN = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3-32b'
]

const DEFAULT_VISION_CHAIN = ['qwen/qwen3.6-27b']

const MS_MINUTE = 60 * 1000
const MS_DAY = 24 * 60 * MS_MINUTE

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
  env.GROQ_MODEL || 'llama-3.3-70b-versatile'

/** Preferred model first, then fallbacks (unique). */
const uniqueModels = (chain) => {
  const unique = []
  for (const model of chain) {
    if (model && !unique.includes(model)) unique.push(model)
  }
  return unique
}

export const getGroqModelChain = () => {
  const primary = getGroqModel()
  const fromEnv = String(env.GROQ_MODEL_FALLBACKS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return uniqueModels([primary, ...fromEnv, ...DEFAULT_MODEL_CHAIN])
}

export const getGroqVisionModelChain = () => {
  const primary = env.GROQ_VISION_MODEL || DEFAULT_VISION_CHAIN[0]
  return uniqueModels([primary, ...DEFAULT_VISION_CHAIN])
}

export const isRateLimitError = (err) => {
  const status = err?.status || err?.statusCode
  const message = err?.message || String(err)
  return (
    status === 429 ||
    status === 413 ||
    /rate.?limit|quota|too many requests|tokens per (day|minute)|TPD|TPM|RPD|RPM|request too large|limit.?reached|reduce your message size/i.test(
      message
    )
  )
}

/** Payload/TPM overflow — try next model, don't blacklist current for the day. */
export const isPayloadTooLargeError = (err) => {
  const status = err?.status || err?.statusCode
  const message = err?.message || String(err)
  return (
    status === 413 ||
    /request too large|reduce your message size|Requested \d+/i.test(message)
  )
}

const headerValue = (err, name) => {
  const headers = err?.headers
  if (!headers) return undefined
  if (typeof headers.get === 'function') return headers.get(name)
  return headers[name] || headers[name.toLowerCase()]
}

const msUntilNextUtcMidnight = () => {
  const now = new Date()
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 5)
  )
  return Math.max(MS_MINUTE, next.getTime() - now.getTime())
}

/** Parse "Please try again in 2h15m30s" / "14m32.5s" from Groq messages. */
const parseTryAgainMs = (message) => {
  const m = String(message || '').match(
    /try again in\s+(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+(?:\.\d+)?)\s*s)?/i
  )
  if (!m) return 0
  const hours = Number(m[1] || 0)
  const minutes = Number(m[2] || 0)
  const seconds = Number(m[3] || 0)
  const ms = (hours * 3600 + minutes * 60 + seconds) * 1000
  return ms > 0 ? Math.min(ms, MS_DAY) : 0
}

/**
 * How long to skip a model after a rate-limit error.
 * Daily quota (RPD/TPD) → until UTC midnight (or Groq's "try again in").
 * Minute quota (RPM/TPM) → short cooldown.
 */
const resolveExhaustionTtlMs = (err) => {
  const message = err?.message || String(err)

  const retryAfterSec = Number(headerValue(err, 'retry-after') || 0)
  if (retryAfterSec > 0) {
    return Math.min(retryAfterSec * 1000, MS_DAY)
  }

  const resetRequests = headerValue(err, 'x-ratelimit-reset-requests')
  const resetTokens = headerValue(err, 'x-ratelimit-reset-tokens')
  for (const raw of [resetRequests, resetTokens]) {
    if (!raw) continue
    // Groq may send duration like "2h15m30.5s" or epoch seconds
    const asNum = Number(raw)
    if (Number.isFinite(asNum) && asNum > 1e12) {
      return Math.min(Math.max(asNum - Date.now(), MS_MINUTE), MS_DAY)
    }
    if (Number.isFinite(asNum) && asNum > 0 && asNum < 86400) {
      return Math.min(asNum * 1000, MS_DAY)
    }
    const fromHeader = parseTryAgainMs(`try again in ${raw}`)
    if (fromHeader > 0) return fromHeader
  }

  const fromMessage = parseTryAgainMs(message)
  if (fromMessage > 0) return fromMessage

  if (/tokens per day|TPD|requests per day|RPD|per day|daily/i.test(message)) {
    return msUntilNextUtcMidnight()
  }

  if (/tokens per minute|TPM|requests per minute|RPM|per minute/i.test(message)) {
    return 2 * MS_MINUTE
  }

  // Unknown 429 on free tier — usually daily; wait until UTC reset
  return msUntilNextUtcMidnight()
}

const markExhausted = (model, err) => {
  const ttlMs = resolveExhaustionTtlMs(err)
  const until = Date.now() + ttlMs
  exhaustedUntil.set(model, until)
  // eslint-disable-next-line no-console
  console.info('[chat-model-exhausted]', {
    model,
    until: new Date(until).toISOString(),
    ttlMinutes: Math.round(ttlMs / MS_MINUTE)
  })
}

const isExhausted = (model) => {
  const until = exhaustedUntil.get(model)
  if (!until) return false
  if (until <= Date.now()) {
    exhaustedUntil.delete(model)
    // eslint-disable-next-line no-console
    console.info('[chat-model-restored]', { model })
    return false
  }
  return true
}

/** First model in chain that is not exhausted (for logging / UI). */
export const getActiveGroqModel = () => {
  const chain = getGroqModelChain()
  return chain.find((model) => !isExhausted(model)) || chain[0] || null
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

const isModelMissingError = (err) => {
  const status = err?.status || err?.statusCode
  const message = err?.message || String(err)
  return (
    status === 404 ||
    /model_not_found|does not exist|decommissioned|no longer (available|supported)|deprecated/i.test(
      message
    )
  )
}

const createOnChain = async (params, chain, { onModelSwitch } = {}) => {
  const client = getGroqClient()
  const usable = chain.filter((model) => !isExhausted(model))
  if (!usable.length) {
    const soonest = [...exhaustedUntil.entries()].sort((a, b) => a[1] - b[1])[0]
    const waitHint = soonest
      ? ` Thử lại sau ${new Date(soonest[1]).toISOString()}.`
      : ''
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      `Tất cả model Groq trong danh sách đều hết hạn mức.${waitHint}`
    )
  }

  let lastError = null
  for (let i = 0; i < usable.length; i += 1) {
    const model = usable[i]
    try {
      const result = await client.chat.completions.create({
        ...params,
        model
      })
      return result
    } catch (err) {
      lastError = err
      const canFallback =
        isRateLimitError(err) ||
        isToolCallGenerationError(err) ||
        isModelMissingError(err)
      if (!canFallback) throw err

      if (
        !isToolCallGenerationError(err) &&
        !isPayloadTooLargeError(err) &&
        !isModelMissingError(err)
      ) {
        markExhausted(model, err)
      }

      const next =
        usable.slice(i + 1).find((item) => !isExhausted(item)) || usable[i + 1]
      // eslint-disable-next-line no-console
      console.info('[chat-model-fallback]', {
        from: model,
        to: next || null,
        reason: err?.message?.slice?.(0, 160)
      })
      if (next && onModelSwitch) {
        onModelSwitch({ from: model, to: next })
      }

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

/**
 * Call Groq chat.completions; on daily/minute rate limit, try next model.
 * After daily reset (TTL), primary model is used again automatically.
 */
export const createChatCompletionWithFallback = async (
  params,
  options = {}
) => createOnChain(params, getGroqModelChain(), options)

/** Vision-capable models only (image + optional tools). */
export const createVisionCompletionWithFallback = async (
  params,
  options = {}
) => createOnChain(params, getGroqVisionModelChain(), options)

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
  if (isPayloadTooLargeError(err) || (status === 413 && /tokens per minute|TPM|request too large/i.test(message))) {
    return new ApiError(
      StatusCodes.REQUEST_TOO_LONG,
      'Ảnh/nội dung quá lớn so với hạn mức Groq. Chụp gần phần nhãn, ảnh rõ và nhỏ hơn rồi gửi lại.'
    )
  }
  if (isRateLimitError(err)) {
    return new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      `Groq hết hạn mức trên mọi model fallback. Đợi reset (thường 00:00 UTC) rồi thử lại. — ${detail}`
    )
  }
  return new ApiError(
    StatusCodes.BAD_GATEWAY,
    `Lỗi Groq: ${detail || 'không xác định'}`
  )
}
