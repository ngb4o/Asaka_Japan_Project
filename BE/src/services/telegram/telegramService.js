/* eslint-disable no-console */
import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb'
import ApiError from '~/utils/ApiError'
import { env } from '~/config/environment'
import { telegramClient } from '~/services/telegram/telegramClient'
import { telegramContactModel } from '~/models/telegramContactModel'
import { telegramNotifyService } from '~/services/telegram/telegramNotifyService'
import { telegramCommands } from '~/services/telegram/telegramCommands'
import { telegramActions } from '~/services/telegram/telegramActions'
import { employeeModel } from '~/models/employeeModel'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { normalizePhone } from '~/utils/phone'

const displayNameFromUser = (user = {}) => {
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
}

const getStatus = async () => {
  const staff = await resolveStaffPreview()
  let botUsername = null

  if (telegramClient.isEnabled()) {
    // Never block settings page on live Telegram getMe (can take seconds)
    const me = telegramClient.getMeCached()
    botUsername = me.ok ? me.data?.username || null : null
  }

  return {
    enabled: telegramClient.isEnabled(),
    hasBotToken: Boolean(env.TELEGRAM_BOT_TOKEN),
    botUsername,
    mode: env.TELEGRAM_WEBHOOK_URL ? 'webhook' : 'polling',
    staffRecipientCount: staff.length
  }
}

const resolveStaffPreview = async () => {
  const fromEnv = env.TELEGRAM_STAFF_CHAT_IDS || []
  const fromDb = (await telegramContactModel.findStaff()).map((item) => item.chatId)
  return [...new Set([...fromEnv, ...fromDb])]
}

const listContacts = async (query = {}) => {
  const limit = Math.min(200, Math.max(1, Number(query.limit) || 50))
  const page = Math.max(1, Number(query.page) || 1)
  const skip = (page - 1) * limit
  const role = query.role || null
  const result = await telegramContactModel.list({ limit, skip, role })

  const envStaffIds = new Set(env.TELEGRAM_STAFF_CHAT_IDS || [])
  const employeeIds = [
    ...new Set(
      result.items
        .map((item) => item.employeeId?.toString?.() || item.employeeId)
        .filter(Boolean)
    )
  ]
  const employeeMap = new Map()
  if (employeeIds.length) {
    const employees = await employeeModel.findMany(
      { _id: { $in: employeeIds.map((id) => new ObjectId(id)) } },
      { limit: employeeIds.length, skip: 0 }
    )
    for (const emp of employees.items || []) {
      employeeMap.set(emp._id.toString(), emp)
    }
  }

  const items = formatDocuments(result.items).map((item) => {
    const employee = item.employeeId
      ? employeeMap.get(String(item.employeeId))
      : null
    return {
      ...item,
      fromEnv: envStaffIds.has(String(item.chatId)),
      employeeName: employee?.fullName || null,
      employeeCode: employee?.code || null
    }
  })

  return {
    items,
    total: result.total,
    page,
    limit,
    envStaffChatIds: [...envStaffIds]
  }
}

const upsertContact = async (body) => {
  if (!body?.chatId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Thiếu chatId!')
  }

  const allowedRoles = Object.values(telegramContactModel.TELEGRAM_CONTACT_ROLE)
  const role = body.role || telegramContactModel.TELEGRAM_CONTACT_ROLE.CUSTOMER
  if (!allowedRoles.includes(role)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Vai trò Telegram không hợp lệ!')
  }

  let employeeId = body.employeeId || null
  let userId = body.userId || null
  let displayName = body.displayName || ''
  let phone = body.phone || ''

  if (employeeId) {
    const employee = await employeeModel.findOneById(employeeId)
    if (!employee) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Nhân viên không hợp lệ!')
    }
    if (!displayName.trim()) {
      displayName = employee.fullName || ''
    }
    if (!phone.trim() && employee.phone) {
      phone = employee.phone
    }
    if (employee.userId) {
      userId = employee.userId.toString()
    }
  }

  const contact = await telegramContactModel.upsertByChatId({
    chatId: body.chatId,
    phone,
    displayName,
    username: body.username || '',
    role,
    employeeId,
    userId
  })

  const formatted = formatDocument(contact)
  if (employeeId) {
    const employee = await employeeModel.findOneById(employeeId)
    return {
      ...formatted,
      employeeName: employee?.fullName || null,
      employeeCode: employee?.code || null
    }
  }
  return formatted
}

const deleteContact = async (chatId) => {
  if (!chatId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Thiếu chatId!')
  }

  const existing = await telegramContactModel.findByChatId(chatId)
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy liên hệ Telegram!')
  }

  await telegramContactModel.deleteByChatId(chatId)
  return { message: 'Đã xóa người nhận Telegram!' }
}

const sendTest = async (body) => {
  if (!telegramClient.isEnabled()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Telegram chưa bật (TELEGRAM_ENABLED=true)!')
  }

  const text = body?.text || 'ASAKA CRM — Tin nhắn thử nghiệm từ hệ thống.'

  let results

  if (body?.chatId) {
    results = [await telegramClient.sendTextMessage(body.chatId, text)]
  } else if (body?.staff) {
    results = await telegramNotifyService.notifyStaff(text)
  } else {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cần chatId hoặc staff=true! (Bot chỉ gửi nội bộ, không gửi theo SĐT khách/đại lý)'
    )
  }

  if (results?.skipped) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      results.reason === 'no_staff'
        ? 'Chưa có người nhận staff. Thêm Chat ID trong CRM hoặc TELEGRAM_STAFF_CHAT_IDS.'
        : `Không gửi được: ${results.reason || 'skipped'}`
    )
  }

  const list = Array.isArray(results) ? results : [results]
  const failed = list.filter((item) => item && !item.ok && !item.skipped)
  const okCount = list.filter((item) => item?.ok).length

  if (!okCount) {
    const firstError = failed[0]?.error
    const detail =
      firstError?.timedOut
        ? 'Timeout khi gọi api.telegram.org (mạng chậm / bị chặn). Thử lại hoặc kiểm tra VPN.'
        : firstError?.description ||
          firstError?.message ||
          JSON.stringify(firstError || {})
    throw new ApiError(StatusCodes.BAD_GATEWAY, `Gửi Telegram thất bại: ${detail}`)
  }

  return {
    ok: true,
    sent: okCount,
    failed: failed.length,
    results: list
  }
}

const setWebhook = async (body = {}) => {
  if (!telegramClient.isEnabled()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Telegram chưa bật!')
  }

  const url = body.url || env.TELEGRAM_WEBHOOK_URL
  if (!url) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Thiếu webhook URL (body.url hoặc TELEGRAM_WEBHOOK_URL)!'
    )
  }

  return await telegramClient.setWebhook(url, env.TELEGRAM_WEBHOOK_SECRET || undefined)
}

const getWebhookInfo = async () => {
  if (!telegramClient.isEnabled()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Telegram chưa bật!')
  }

  return await telegramClient.getWebhookInfo()
}

const ensureWebhookConfigured = async () => {
  if (!telegramClient.isEnabled()) {
    return { skipped: true, reason: 'telegram_disabled' }
  }

  if (!env.TELEGRAM_WEBHOOK_URL) {
    return { skipped: true, reason: 'missing_webhook_url' }
  }

  const info = await telegramClient.getWebhookInfo()
  const currentUrl = info?.ok ? info.data?.url || '' : ''
  const shouldSet = !info?.ok || currentUrl !== env.TELEGRAM_WEBHOOK_URL

  let webhookResult = info
  if (shouldSet) {
    webhookResult = await telegramClient.setWebhook(
      env.TELEGRAM_WEBHOOK_URL,
      env.TELEGRAM_WEBHOOK_SECRET || undefined
    )
  }

  const commandsResult = await telegramCommands.registerBotCommands()

  return {
    ok: Boolean(webhookResult?.ok && commandsResult?.ok),
    webhook: webhookResult,
    commands: commandsResult
  }
}

/**
 * Process one Telegram update (from webhook or long-polling).
 */
const processUpdate = async (update = {}) => {
  if (update.callback_query) {
    return await telegramActions.handleCallbackQuery(update.callback_query)
  }

  const message = update.message || update.edited_message
  if (!message?.chat?.id) {
    return { ok: true }
  }

  const chatId = String(message.chat.id)
  const from = message.from || {}
  const displayName = displayNameFromUser(from) || message.chat.title || ''
  const username = from.username || ''

  const existing = await telegramContactModel.findByChatId(chatId)
  const envStaff = (env.TELEGRAM_STAFF_CHAT_IDS || []).includes(chatId)
  const keepStaff =
    envStaff ||
    existing?.role === telegramContactModel.TELEGRAM_CONTACT_ROLE.STAFF
  const role = keepStaff
    ? telegramContactModel.TELEGRAM_CONTACT_ROLE.STAFF
    : telegramContactModel.TELEGRAM_CONTACT_ROLE.CUSTOMER

  await telegramContactModel.upsertByChatId({
    chatId,
    phone: existing?.phone || '',
    displayName: displayName || existing?.displayName || '',
    username: username || existing?.username || '',
    role,
    lastInteractedAt: new Date()
  })

  if (message.contact?.phone_number) {
    const phone = normalizePhone(message.contact.phone_number)
    await telegramContactModel.upsertByChatId({
      chatId,
      phone,
      displayName: message.contact.first_name || displayName,
      username,
      role,
      lastInteractedAt: new Date()
    })

    await telegramClient.sendTextMessage(
      chatId,
      `✅ Đã lưu SĐT ${phone}.\nGõ /help để xem lệnh tra cứu CRM.`
    )
    return { ok: true }
  }

  const text = (message.text || '').trim()
  if (!text) {
    return { ok: true }
  }

  if (/^\/id(?:@\w+)?$/i.test(text)) {
    const staff = await telegramCommands.isStaffChat(chatId)
    await telegramClient.sendTextMessage(
      chatId,
      [
        `🆔 Chat ID: ${chatId}`,
        staff
          ? '✅ Đã có quyền nội bộ (staff).'
          : 'ℹ️ Chưa phải staff — nhờ admin thêm trong CRM.',
        '',
        'Gõ /help để xem lệnh.'
      ].join('\n')
    )
    return { ok: true }
  }

  const startMatch = text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i)
  if (startMatch) {
    const staff = await telegramCommands.isStaffChat(chatId)
    await telegramClient.sendTextMessage(
      chatId,
      [
        '👋 Chào bạn — Bot nội bộ ASAKA CRM.',
        '',
        staff
          ? 'Bạn đã được gán quyền staff. Gõ /help để tra cứu đơn, công nợ, kho…'
          : [
            'Bot này gửi thông báo nội bộ ASAKA.',
            'Để dùng lệnh tra cứu CRM, nhờ admin thêm Chat ID của bạn:',
            'CRM → Hệ thống → Thông báo Telegram',
            `Chat ID của bạn: ${chatId}`
          ].join('\n'),
        '',
        'Gõ /help hoặc /id bất cứ lúc nào.'
      ].join('\n')
    )
    return { ok: true }
  }

  const phoneCommand = text.match(/^(?:sdt|phone)\s*[:\s]*([0-9+\s]+)$/i)
  if (phoneCommand) {
    const phone = normalizePhone(phoneCommand[1])
    await telegramContactModel.upsertByChatId({
      chatId,
      phone,
      displayName,
      username,
      role,
      lastInteractedAt: new Date()
    })

    await telegramClient.sendTextMessage(
      chatId,
      `✅ Đã lưu SĐT ${phone}.\nGõ /help để xem lệnh.`
    )
    return { ok: true }
  }

  try {
    const commandResult = await telegramCommands.handleStaffCommand(chatId, text)
    if (commandResult.handled) {
      if (commandResult.reply) {
        await telegramClient.sendTextMessage(chatId, commandResult.reply, {
          replyMarkup: commandResult.replyMarkup
        })
      }
      return { ok: true }
    }
  } catch (error) {
    console.error('[telegram] command error', error?.message || error)
    await telegramClient.sendTextMessage(
      chatId,
      '⚠️ Lỗi khi xử lý lệnh. Thử lại hoặc kiểm tra CRM.'
    )
    return { ok: true }
  }

  await telegramContactModel.touchInteraction(chatId)
  await telegramClient.sendTextMessage(
    chatId,
    'Không hiểu lệnh. Gõ /help để xem danh sách.'
  )
  return { ok: true }
}

const handleWebhook = async (update = {}, headers = {}) => {
  if (env.TELEGRAM_WEBHOOK_SECRET) {
    const secret = headers['x-telegram-bot-api-secret-token']
    if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Webhook secret không hợp lệ!')
    }
  }

  return await processUpdate(update)
}

export const telegramService = {
  getStatus,
  listContacts,
  upsertContact,
  deleteContact,
  sendTest,
  setWebhook,
  getWebhookInfo,
  ensureWebhookConfigured,
  processUpdate,
  handleWebhook
}
