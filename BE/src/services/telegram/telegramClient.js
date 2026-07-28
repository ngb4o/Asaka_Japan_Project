/* eslint-disable no-console */
import dns from 'dns'
import { env } from '~/config/environment'

// Nhiều mạng VN/macOS resolve IPv6 Telegram trước rồi treo — ưu tiên IPv4
try {
  dns.setDefaultResultOrder('ipv4first')
} catch {
  // Node cũ hơn có thể không hỗ trợ
}

const DEFAULT_TIMEOUT_MS = 30000
const SEND_TIMEOUT_MS = 30000
const GET_ME_TIMEOUT_MS = 10000
const GET_ME_CACHE_MS = 5 * 60 * 1000

let getMeCache = {
  at: 0,
  result: null
}

const apiUrl = (method) =>
  `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`

const isEnabled = () => Boolean(env.TELEGRAM_ENABLED && env.TELEGRAM_BOT_TOKEN)

const callApi = async (method, body = {}, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) => {
  if (!isEnabled()) {
    return { skipped: true, reason: 'telegram_disabled' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(apiUrl(method), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    })

    const data = await response.json().catch(() => ({}))

    if (!data.ok) {
      console.error('[telegram] api failed', { method, data })
      return { ok: false, error: data }
    }

    return { ok: true, data: data.result }
  } catch (error) {
    const timedOut = error?.name === 'AbortError'
    console.error('[telegram] api error', {
      method,
      timedOut,
      message: error?.message || error
    })
    return {
      ok: false,
      error: {
        timedOut,
        message: timedOut ? `Telegram API timeout (${timeoutMs}ms)` : String(error?.message || error)
      }
    }
  } finally {
    clearTimeout(timer)
  }
}

const sendTextMessage = async (chatId, text, { replyMarkup } = {}) => {
  if (!chatId || !text?.trim()) {
    return { skipped: true, reason: 'missing_chat_or_text' }
  }

  const body = {
    chat_id: String(chatId),
    text: String(text).trim(),
    disable_web_page_preview: true
  }

  if (replyMarkup) {
    body.reply_markup = replyMarkup
  }

  return await callApi('sendMessage', body, { timeoutMs: SEND_TIMEOUT_MS })
}

const answerCallbackQuery = async (callbackQueryId, { text, showAlert = false } = {}) => {
  if (!callbackQueryId) {
    return { skipped: true, reason: 'missing_callback_query_id' }
  }

  const body = {
    callback_query_id: String(callbackQueryId),
    show_alert: Boolean(showAlert)
  }
  if (text) body.text = String(text).slice(0, 200)

  return await callApi('answerCallbackQuery', body, { timeoutMs: SEND_TIMEOUT_MS })
}

const editMessageText = async ({
  chatId,
  messageId,
  text,
  replyMarkup,
  inlineMessageId
} = {}) => {
  if (!text?.trim()) {
    return { skipped: true, reason: 'missing_text' }
  }

  const body = {
    text: String(text).trim(),
    disable_web_page_preview: true
  }

  if (inlineMessageId) {
    body.inline_message_id = String(inlineMessageId)
  } else {
    if (!chatId || messageId == null) {
      return { skipped: true, reason: 'missing_chat_or_message' }
    }
    body.chat_id = String(chatId)
    body.message_id = Number(messageId)
  }

  if (replyMarkup !== undefined) {
    body.reply_markup = replyMarkup
  }

  return await callApi('editMessageText', body, { timeoutMs: SEND_TIMEOUT_MS })
}

const editMessageReplyMarkup = async ({
  chatId,
  messageId,
  replyMarkup = { inline_keyboard: [] },
  inlineMessageId
} = {}) => {
  const body = { reply_markup: replyMarkup }

  if (inlineMessageId) {
    body.inline_message_id = String(inlineMessageId)
  } else {
    if (!chatId || messageId == null) {
      return { skipped: true, reason: 'missing_chat_or_message' }
    }
    body.chat_id = String(chatId)
    body.message_id = Number(messageId)
  }

  return await callApi('editMessageReplyMarkup', body, { timeoutMs: SEND_TIMEOUT_MS })
}

const getMe = async ({ force = false } = {}) => {
  const now = Date.now()
  if (!force && getMeCache.result && now - getMeCache.at < GET_ME_CACHE_MS) {
    return getMeCache.result
  }

  const result = await callApi('getMe', {}, { timeoutMs: GET_ME_TIMEOUT_MS })
  if (result.ok) {
    getMeCache = { at: now, result }
  }
  return result
}

const getUpdates = async ({ offset, timeout = 25, allowed_updates } = {}) => {
  const body = { timeout }
  if (offset !== undefined) body.offset = offset
  if (allowed_updates) body.allowed_updates = allowed_updates
  // Long-poll needs HTTP timeout > Telegram timeout
  return await callApi('getUpdates', body, { timeoutMs: (timeout + 10) * 1000 })
}

const setWebhook = async (url, secretToken) => {
  const body = {
    url,
    allowed_updates: ['message', 'callback_query', 'edited_message']
  }
  if (secretToken) body.secret_token = secretToken
  return await callApi('setWebhook', body)
}

const deleteWebhook = async ({ drop_pending_updates = false } = {}) =>
  callApi('deleteWebhook', { drop_pending_updates })

const getWebhookInfo = async () => callApi('getWebhookInfo')

const setMyCommands = async (commands = []) =>
  callApi('setMyCommands', { commands })

export const telegramClient = {
  isEnabled,
  sendTextMessage,
  answerCallbackQuery,
  editMessageText,
  editMessageReplyMarkup,
  getMe,
  getUpdates,
  setWebhook,
  deleteWebhook,
  getWebhookInfo,
  setMyCommands
}
