import { orderModel } from '~/models/orderModel'

const ORDER_STATUS_SHORT = {
  [orderModel.ORDER_STATUS.PENDING]: 'Chờ xử lý',
  [orderModel.ORDER_STATUS.CONFIRMED]: 'Đã xác nhận',
  [orderModel.ORDER_STATUS.DELIVERING]: 'Đang giao',
  [orderModel.ORDER_STATUS.COMPLETED]: 'Hoàn tất',
  [orderModel.ORDER_STATUS.CANCELLED]: 'Đã hủy'
}

const PAYMENT_SHORT = {
  [orderModel.PAYMENT_STATUS.UNPAID]: 'Chưa TT',
  [orderModel.PAYMENT_STATUS.PARTIAL]: 'TT một phần',
  [orderModel.PAYMENT_STATUS.PAID]: 'Đã TT'
}

const money = (value) => {
  const amount = Number(value) || 0
  if (amount >= 1_000_000) {
    const mil = amount / 1_000_000
    const text = Number.isInteger(mil) ? String(mil) : mil.toFixed(1).replace(/\.0$/, '')
    return `${text}tr`
  }
  if (amount >= 1_000) {
    return `${Math.round(amount / 1_000)}k`
  }
  return `${amount.toLocaleString('vi-VN')}đ`
}

const join = (...parts) => parts.filter(Boolean).join(' · ')

const push = (title, body, url, tag) => ({
  title,
  body: body || '',
  url,
  tag
})

/** Short lock-screen copy (FB / Shopee style). Telegram keeps full templates. */
export const webPushCopy = {
  pendingOrder: (order) =>
    push(
      'Đơn mới',
      join(order.code, order.customerName, money(order.total)),
      '/orders',
      'order'
    ),

  orderStatus: (order) =>
    push(
      ORDER_STATUS_SHORT[order.status] || 'Cập nhật đơn',
      join(order.code, order.customerName, money(order.total)),
      '/orders',
      'order'
    ),

  paymentReminder: (order) => {
    const remaining = Math.max(
      0,
      (Number(order.total) || 0) - (Number(order.paidAmount) || 0)
    )
    return push(
      'Công nợ',
      join(order.code, order.customerName, `còn ${money(remaining)}`),
      '/orders',
      'debt'
    )
  },

  paymentUpdate: (order) =>
    push(
      PAYMENT_SHORT[order.paymentStatus] || 'Thanh toán',
      join(order.code, order.customerName, money(order.paidAmount || order.total)),
      '/orders',
      'payment'
    ),

  newLead: (lead) =>
    push(
      lead.type === 'dealer' ? 'Đăng ký đại lý' : 'Lead mới',
      join(lead.name, lead.phone, lead.company || lead.region),
      '/leads',
      'lead'
    ),

  pendingDealer: (dealer) =>
    push(
      'Đại lý chờ duyệt',
      join(dealer.name, dealer.phone || dealer.contactName, dealer.region),
      '/dealers',
      'dealer'
    ),

  dealerApproved: (dealer) =>
    push('Đại lý đã duyệt', join(dealer.name, dealer.region), '/dealers', 'dealer'),

  tripStarted: (trip, stopCount = 0) =>
    push(
      'Chuyến đã bắt đầu',
      join(trip.code, stopCount > 0 ? `${stopCount} điểm giao` : null),
      '/trips',
      'trip'
    ),

  lowStock: ({ productName, quantity, warehouseName }) =>
    push(
      'Tồn kho thấp',
      join(productName, `còn ${quantity}`, warehouseName),
      '/inventory',
      'stock'
    )
}
