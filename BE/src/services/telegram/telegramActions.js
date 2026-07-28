/* eslint-disable no-console */
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { orderModel } from '~/models/orderModel'
import { dealerModel } from '~/models/dealerModel'
import { leadModel } from '~/models/leadModel'
import { telegramContactModel } from '~/models/telegramContactModel'
import { telegramActionMessageModel } from '~/models/telegramActionMessageModel'
import { telegramClient } from '~/services/telegram/telegramClient'
import { telegramCommands } from '~/services/telegram/telegramCommands'
import { telegramKeyboards } from '~/services/telegram/telegramKeyboards'
import { telegramTemplates } from '~/services/telegram/telegramTemplates'
import { telegramNotifyService } from '~/services/telegram/telegramNotifyService'
import { orderService } from '~/services/orderService'
import { dealerService } from '~/services/dealerService'
import { leadService } from '~/services/leadService'
import ApiError from '~/utils/ApiError'
import { normalizePhone } from '~/utils/phone'

const ORDER_ACTION_RE = /^a:o:([cgpqfZx]):([a-f0-9]{24})$/i
const DEALER_ACTION_RE = /^a:d:(a):([a-f0-9]{24})$/i
const LEAD_STATUS_RE =
  /^a:l:s:(new|contacted|qualified|converted|closed):([a-f0-9]{24})$/i

const LEAD_STATUS_SET = new Set(Object.values(leadModel.LEAD_STATUS))

const actorLabel = (from = {}) => {
  const name = [from.first_name, from.last_name].filter(Boolean).join(' ').trim()
  if (from.username) return name ? `${name} (@${from.username})` : `@${from.username}`
  return name || `chat ${from.id || ''}`
}

const resolveActorUserId = async (chatId) => {
  const contact = await telegramContactModel.findByChatId(chatId)
  const phone = normalizePhone(contact?.phone || '')

  if (phone) {
    const employee = await GET_DB()
      .collection('employees')
      .findOne({ phone, userId: { $ne: null }, _destroy: { $ne: true } })

    if (employee?.userId) return employee.userId.toString()
  }

  const admin = await GET_DB()
    .collection('users')
    .findOne({ role: 'admin', _destroy: { $ne: true } })

  return admin?._id?.toString() || null
}

const withActorNote = (baseText, footerLines) => {
  const cleaned = String(baseText || '')
    .replace(/\n*────────────\n(?:✅|💰|📞|🔄|🚚|🎉|❌)[\s\S]*$/u, '')
    .trim()
  return `${cleaned}\n\n────────────\n${footerLines.join('\n')}`
}

const syncTrackedMessages = async ({
  entityType,
  entityId,
  kind,
  text,
  replyMarkup,
  close = false
}) => {
  const tracked = await telegramActionMessageModel.findOne({
    entityType,
    entityId,
    kind
  })

  const messages = tracked?.messages || []
  if (!messages.length) return { synced: 0 }

  await Promise.all(
    messages.map((ref) =>
      telegramClient.editMessageText({
        chatId: ref.chatId,
        messageId: ref.messageId,
        text,
        replyMarkup
      })
    )
  )

  if (close) {
    await telegramActionMessageModel.markClosed({ entityType, entityId, kind })
  }

  return { synced: messages.length }
}

const syncOrderTrackedMessages = async ({
  orderId,
  text,
  replyMarkup,
  close = false
}) => {
  const kinds = [
    telegramNotifyService.TRACK_KIND.PENDING_ORDER,
    telegramNotifyService.TRACK_KIND.ORDER_FLOW
  ]

  let total = 0
  for (const kind of kinds) {
    const result = await syncTrackedMessages({
      entityType: 'order',
      entityId: orderId,
      kind,
      text,
      replyMarkup,
      close
    })
    total += result.synced
  }
  return { synced: total }
}

const finishError = async (callbackQuery, message, { alert = true } = {}) => {
  await telegramClient.answerCallbackQuery(callbackQuery.id, {
    text: message,
    showAlert: alert
  })
}

const confirmOrder = async (orderId, chatId) => {
  const order = await orderModel.findOneById(orderId)
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng')

  if (order.status === orderModel.ORDER_STATUS.CANCELLED) {
    throw new ApiError(409, 'Đơn đã hủy, không thể xác nhận')
  }

  if (order.status !== orderModel.ORDER_STATUS.PENDING) {
    throw new ApiError(409, `Đơn đang ở trạng thái «${order.status}», không cần xác nhận`)
  }

  const userId = await resolveActorUserId(chatId)
  if (!userId) {
    throw new ApiError(
      400,
      'Không xác định được tài khoản CRM cho xuất kho. Thêm SĐT staff hoặc tạo user admin.'
    )
  }

  if (!order.warehouseId) {
    throw new ApiError(400, 'Đơn chưa chọn kho — mở CRM để chọn kho rồi xác nhận')
  }

  const updated = await orderService.update(
    orderId,
    { status: orderModel.ORDER_STATUS.CONFIRMED },
    userId
  )

  return {
    toast: 'Đã xác nhận đơn',
    label: '✅ Đã xác nhận đơn',
    entityType: 'order',
    entityId: orderId,
    kind: telegramNotifyService.TRACK_KIND.PENDING_ORDER,
    close: true,
    syncOrder: true,
    buildText: (who, when) =>
      withActorNote(telegramTemplates.orderLifecycle(updated), [
        '✅ Đã xác nhận đơn',
        `👤 ${who}`,
        `🕒 ${when}`
      ]),
    replyMarkup: telegramKeyboards.orderActions(updated)
  }
}

const markPaidFull = async (orderId) => {
  const order = await orderModel.findOneById(orderId)
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng')

  if (order.status === orderModel.ORDER_STATUS.CANCELLED) {
    throw new ApiError(409, 'Đơn đã hủy')
  }

  if (order.paymentStatus === orderModel.PAYMENT_STATUS.PAID) {
    throw new ApiError(409, 'Đơn đã thanh toán đủ')
  }

  const remaining = Math.max(
    0,
    (Number(order.total) || 0) - (Number(order.paidAmount) || 0)
  )

  if (remaining <= 0) {
    throw new ApiError(409, 'Không còn số tiền cần thu')
  }

  const updated = await orderService.recordPayment(orderId, {
    amount: remaining,
    note: 'Ghi nhận đủ qua Telegram bot'
  })

  return {
    toast: 'Đã ghi nhận thu đủ',
    label: '💰 Đã ghi nhận thu đủ',
    entityType: 'order',
    entityId: orderId,
    kind: telegramNotifyService.TRACK_KIND.PAYMENT_REMINDER,
    close: true,
    buildText: (who, when) =>
      withActorNote(telegramTemplates.paymentUpdate(updated), [
        '💰 Đã ghi nhận thu đủ',
        `👤 ${who}`,
        `🕒 ${when}`
      ]),
    replyMarkup: telegramKeyboards.empty()
  }
}

const transitionOrderStatus = async (orderId, nextStatus, chatId, { toast, label }) => {
  const order = await orderModel.findOneById(orderId)
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng')

  if (order.status === orderModel.ORDER_STATUS.CANCELLED) {
    throw new ApiError(409, 'Đơn đã hủy')
  }

  if (nextStatus === orderModel.ORDER_STATUS.DELIVERING) {
    if (order.status !== orderModel.ORDER_STATUS.CONFIRMED) {
      throw new ApiError(409, 'Chỉ chuyển «Đang giao» khi đơn đã xác nhận')
    }
  }

  if (nextStatus === orderModel.ORDER_STATUS.COMPLETED) {
    if (order.status !== orderModel.ORDER_STATUS.DELIVERING) {
      throw new ApiError(409, 'Chỉ hoàn thành khi đơn đang giao')
    }
  }

  if (nextStatus === orderModel.ORDER_STATUS.CANCELLED) {
    if (order.status === orderModel.ORDER_STATUS.COMPLETED) {
      throw new ApiError(409, 'Đơn đã hoàn thành, không thể hủy')
    }
  }

  const userId = await resolveActorUserId(chatId)
  if (!userId) {
    throw new ApiError(400, 'Không xác định được tài khoản CRM. Thêm SĐT staff hoặc user admin.')
  }

  const updated = await orderService.update(orderId, { status: nextStatus }, userId)
  const terminal = [
    orderModel.ORDER_STATUS.COMPLETED,
    orderModel.ORDER_STATUS.CANCELLED
  ].includes(updated.status)

  return {
    toast,
    label,
    entityType: 'order',
    entityId: orderId,
    kind: telegramNotifyService.TRACK_KIND.ORDER_FLOW,
    close: terminal,
    syncOrder: true,
    buildText: (who, when) =>
      withActorNote(telegramTemplates.orderLifecycle(updated), [
        label,
        `👤 ${who}`,
        `🕒 ${when}`
      ]),
    replyMarkup: terminal ? telegramKeyboards.empty() : telegramKeyboards.orderActions(updated)
  }
}

const promptCancelOrder = async (callbackQuery, orderId) => {
  const order = await orderModel.findOneById(orderId)
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng')

  if (order.status === orderModel.ORDER_STATUS.CANCELLED) {
    throw new ApiError(409, 'Đơn đã hủy')
  }
  if (order.status === orderModel.ORDER_STATUS.COMPLETED) {
    throw new ApiError(409, 'Đơn đã hoàn thành, không thể hủy')
  }

  await telegramClient.answerCallbackQuery(callbackQuery.id, {
    text: 'Xác nhận hủy đơn?'
  })

  const message = callbackQuery.message
  if (message?.chat?.id != null && message.message_id != null) {
    await telegramClient.editMessageReplyMarkup({
      chatId: message.chat.id,
      messageId: message.message_id,
      replyMarkup: telegramKeyboards.cancelConfirm(orderId)
    })
  }

  return { handled: true }
}

const abortCancelOrder = async (callbackQuery, orderId) => {
  const order = await orderModel.findOneById(orderId)
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng')

  await telegramClient.answerCallbackQuery(callbackQuery.id, {
    text: 'Đã hủy thao tác'
  })

  const message = callbackQuery.message
  if (message?.chat?.id != null && message.message_id != null) {
    await telegramClient.editMessageReplyMarkup({
      chatId: message.chat.id,
      messageId: message.message_id,
      replyMarkup: telegramKeyboards.orderActions(order)
    })
  }

  return { handled: true }
}

const refreshCongNoListMessage = async (callbackQuery) => {
  const message = callbackQuery.message
  if (!message?.text?.includes('ASAKA CRM — Công nợ')) {
    return false
  }

  const payload = await telegramCommands.buildCongNoReply('')
  await telegramClient.editMessageText({
    chatId: message.chat.id,
    messageId: message.message_id,
    text: payload.reply,
    replyMarkup: payload.replyMarkup
  })
  return true
}

const setLeadStatus = async (leadId, nextStatus) => {
  if (!LEAD_STATUS_SET.has(nextStatus)) {
    throw new ApiError(400, 'Trạng thái lead không hợp lệ')
  }

  const lead = await leadModel.findOneById(leadId)
  if (!lead) throw new ApiError(404, 'Không tìm thấy lead')

  if (lead.status === nextStatus) {
    throw new ApiError(409, 'Lead đã ở trạng thái này')
  }

  const updated = await leadService.update(leadId, { status: nextStatus })
  const statusLabel =
    telegramTemplates.LEAD_STATUS_LABEL[nextStatus] || nextStatus

  return {
    toast: `Đã đổi → ${statusLabel}`,
    label: `🔄 Trạng thái: ${statusLabel}`,
    entityType: 'lead',
    entityId: leadId,
    kind: telegramNotifyService.TRACK_KIND.LEAD,
    close: false,
    buildText: (who, when) =>
      withActorNote(telegramTemplates.newLeadStaff(updated), [
        `🔄 Trạng thái: ${statusLabel}`,
        `👤 ${who}`,
        `🕒 ${when}`
      ]),
    replyMarkup: telegramKeyboards.leadStatuses(leadId, nextStatus)
  }
}

const approveDealer = async (dealerId) => {
  const dealer = await dealerModel.findOneById(dealerId)
  if (!dealer) throw new ApiError(404, 'Không tìm thấy đại lý')

  if (dealer.status === dealerModel.DEALER_STATUS.ACTIVE) {
    throw new ApiError(409, 'Đại lý đã được duyệt')
  }

  if (dealer.status === dealerModel.DEALER_STATUS.INACTIVE) {
    throw new ApiError(409, 'Đại lý đang ngưng — mở CRM để kích hoạt lại')
  }

  const updated = await dealerService.update(dealerId, {
    status: dealerModel.DEALER_STATUS.ACTIVE
  })

  return {
    toast: 'Đã duyệt đại lý',
    label: '✅ Đã duyệt đại lý',
    entityType: 'dealer',
    entityId: dealerId,
    kind: telegramNotifyService.TRACK_KIND.PENDING_DEALER,
    close: true,
    buildText: (who, when) =>
      withActorNote(telegramTemplates.dealerApproved(updated), [
        '✅ Đã duyệt đại lý',
        `👤 ${who}`,
        `🕒 ${when}`
      ]),
    replyMarkup: telegramKeyboards.empty()
  }
}

/**
 * Handle Telegram callback_query from inline buttons.
 */
const handleCallbackQuery = async (callbackQuery = {}) => {
  const chatId = String(callbackQuery.message?.chat?.id || callbackQuery.from?.id || '')
  const data = String(callbackQuery.data || '')

  if (!chatId || !callbackQuery.id) {
    return { ok: false, reason: 'invalid_callback' }
  }

  const isStaff = await telegramCommands.isStaffChat(chatId)
  if (!isStaff) {
    await finishError(callbackQuery, 'Chỉ nhân sự nội bộ mới dùng được nút này.')
    return { ok: false, reason: 'not_staff' }
  }

  try {
    let result

    const leadMatch = data.match(LEAD_STATUS_RE)
    const orderMatch = data.match(ORDER_ACTION_RE)
    const dealerMatch = data.match(DEALER_ACTION_RE)

    if (leadMatch) {
      const [, status, id] = leadMatch
      if (!ObjectId.isValid(id)) {
        await finishError(callbackQuery, 'ID không hợp lệ.')
        return { ok: false, reason: 'bad_id' }
      }
      result = await setLeadStatus(id, status)
    } else if (orderMatch) {
      const [, action, id] = orderMatch
      if (!ObjectId.isValid(id)) {
        await finishError(callbackQuery, 'ID không hợp lệ.')
        return { ok: false, reason: 'bad_id' }
      }

      if (action === 'q') {
        await promptCancelOrder(callbackQuery, id)
        return { ok: true }
      }
      if (action === 'x') {
        await abortCancelOrder(callbackQuery, id)
        return { ok: true }
      }

      if (action === 'c') {
        result = await confirmOrder(id, chatId)
      } else if (action === 'p') {
        result = await markPaidFull(id)
        await telegramClient.answerCallbackQuery(callbackQuery.id, {
          text: result.toast
        })

        const refreshed = await refreshCongNoListMessage(callbackQuery)
        if (refreshed) {
          return { ok: true, refreshedCongNo: true }
        }

        const who = actorLabel(callbackQuery.from)
        const when = new Date().toLocaleString('vi-VN')
        const text = result.buildText(who, when)

        const synced = await syncTrackedMessages({
          entityType: result.entityType,
          entityId: result.entityId,
          kind: result.kind,
          text,
          replyMarkup: result.replyMarkup,
          close: result.close
        })

        if (!synced.synced && callbackQuery.message?.chat?.id != null) {
          await telegramClient.editMessageText({
            chatId: callbackQuery.message.chat.id,
            messageId: callbackQuery.message.message_id,
            text,
            replyMarkup: result.replyMarkup
          })
        }

        return { ok: true, synced: synced.synced }
      } else if (action === 'g') {
        result = await transitionOrderStatus(
          id,
          orderModel.ORDER_STATUS.DELIVERING,
          chatId,
          { toast: 'Đã chuyển đang giao', label: '🚚 Đang giao' }
        )
      } else if (action === 'f') {
        result = await transitionOrderStatus(
          id,
          orderModel.ORDER_STATUS.COMPLETED,
          chatId,
          { toast: 'Đã hoàn thành đơn', label: '🎉 Hoàn thành' }
        )
      } else if (action === 'Z') {
        result = await transitionOrderStatus(
          id,
          orderModel.ORDER_STATUS.CANCELLED,
          chatId,
          { toast: 'Đã hủy đơn', label: '❌ Đã hủy đơn' }
        )
      } else {
        await finishError(callbackQuery, 'Hành động không hỗ trợ.')
        return { ok: false, reason: 'unsupported' }
      }
    } else if (dealerMatch) {
      const [, , id] = dealerMatch
      if (!ObjectId.isValid(id)) {
        await finishError(callbackQuery, 'ID không hợp lệ.')
        return { ok: false, reason: 'bad_id' }
      }
      result = await approveDealer(id)
    } else {
      await finishError(callbackQuery, 'Nút không hợp lệ hoặc đã hết hạn.')
      return { ok: false, reason: 'bad_data' }
    }

    const who = actorLabel(callbackQuery.from)
    const when = new Date().toLocaleString('vi-VN')
    const text = result.buildText(who, when)

    await telegramClient.answerCallbackQuery(callbackQuery.id, {
      text: result.toast
    })

    let synced = { synced: 0 }
    if (result.syncOrder) {
      synced = await syncOrderTrackedMessages({
        orderId: result.entityId,
        text,
        replyMarkup: result.replyMarkup,
        close: result.close
      })
    } else {
      synced = await syncTrackedMessages({
        entityType: result.entityType,
        entityId: result.entityId,
        kind: result.kind,
        text,
        replyMarkup: result.replyMarkup,
        close: result.close
      })
    }

    if (!synced.synced && callbackQuery.message?.chat?.id != null) {
      await telegramClient.editMessageText({
        chatId: callbackQuery.message.chat.id,
        messageId: callbackQuery.message.message_id,
        text,
        replyMarkup: result.replyMarkup
      })
    }

    return { ok: true, synced: synced.synced }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : error?.message || 'Không thực hiện được hành động'

    console.error('[telegram] action error', message)
    await finishError(callbackQuery, message)
    return { ok: false, reason: 'action_failed', message }
  }
}

export const telegramActions = {
  handleCallbackQuery,
  resolveActorUserId,
  syncTrackedMessages
}
