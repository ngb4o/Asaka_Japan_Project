import { leadModel } from '~/models/leadModel'
import { orderModel } from '~/models/orderModel'

/** Callback data ≤ 64 bytes. */

const inlineKeyboard = (rows) => ({
  inline_keyboard: rows
})

const button = (text, callbackData) => ({
  text,
  callback_data: String(callbackData).slice(0, 64)
})

const orderIdStr = (order) => {
  if (!order) return ''
  if (order.id) return String(order.id)
  if (order._id) return order._id.toString()
  return ''
}

/** Nút theo trạng thái đơn: xác nhận / giao / hoàn thành / hủy (hủy có bước xác nhận). */
const orderActions = (order) => {
  const id = orderIdStr(order)
  const status = order?.status
  if (!id || !status) return inlineKeyboard([])

  const rows = []

  if (status === orderModel.ORDER_STATUS.PENDING) {
    rows.push([button('✅ Xác nhận đơn', `a:o:c:${id}`)])
    rows.push([button('❌ Hủy đơn', `a:o:q:${id}`)])
  } else if (status === orderModel.ORDER_STATUS.CONFIRMED) {
    rows.push([button('🚚 Đang giao', `a:o:g:${id}`)])
    rows.push([button('❌ Hủy đơn', `a:o:q:${id}`)])
  } else if (status === orderModel.ORDER_STATUS.DELIVERING) {
    rows.push([button('🎉 Hoàn thành', `a:o:f:${id}`)])
    rows.push([button('❌ Hủy đơn', `a:o:q:${id}`)])
  }

  return rows.length ? inlineKeyboard(rows) : inlineKeyboard([])
}

const cancelConfirm = (orderId) =>
  inlineKeyboard([
    [
      button('✅ Đồng ý hủy', `a:o:Z:${orderId}`),
      button('↩️ Không hủy', `a:o:x:${orderId}`)
    ]
  ])

const markPaidFull = (orderId) =>
  inlineKeyboard([[button('💰 Đã thu đủ', `a:o:p:${orderId}`)]])

/** Một nút «Thu đủ» cho mỗi đơn trong /congno */
const congnoPayRows = (orders) => {
  const rows = (orders || [])
    .slice(0, 10)
    .map((order) => [
      button(`💰 Thu đủ ${order.code}`, `a:o:p:${orderIdStr(order)}`)
    ])

  return rows.length ? inlineKeyboard(rows) : inlineKeyboard([])
}

const LEAD_STATUS_BUTTONS = [
  { status: leadModel.LEAD_STATUS.NEW, label: 'Mới' },
  { status: leadModel.LEAD_STATUS.CONTACTED, label: 'Đã liên hệ' },
  { status: leadModel.LEAD_STATUS.QUALIFIED, label: 'Tiềm năng' },
  { status: leadModel.LEAD_STATUS.CONVERTED, label: 'Đã chuyển đổi' },
  { status: leadModel.LEAD_STATUS.CLOSED, label: 'Đóng' }
]

/** All lead statuses — current one marked with ✓ */
const leadStatuses = (leadId, currentStatus) => {
  const buttons = LEAD_STATUS_BUTTONS.map(({ status, label }) =>
    button(
      status === currentStatus ? `✓ ${label}` : label,
      `a:l:s:${status}:${leadId}`
    )
  )

  return inlineKeyboard([buttons.slice(0, 3), buttons.slice(3)])
}

const approveDealer = (dealerId) =>
  inlineKeyboard([[button('✅ Duyệt đại lý', `a:d:a:${dealerId}`)]])

/** @deprecated use orderActions */
const confirmOrder = (orderId) =>
  inlineKeyboard([[button('✅ Xác nhận đơn', `a:o:c:${orderId}`)]])

export const telegramKeyboards = {
  orderActions,
  cancelConfirm,
  confirmOrder,
  markPaidFull,
  congnoPayRows,
  leadStatuses,
  leadContacted: (leadId) => leadStatuses(leadId, leadModel.LEAD_STATUS.NEW),
  approveDealer,
  empty: () => inlineKeyboard([])
}
