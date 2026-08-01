import { orderModel } from '~/models/orderModel'

/**
 * Lock-screen copy kiểu TMĐT (Shopee / Grab / Xanh):
 * - Title: emoji + câu hành động
 * - Body: tên đại lý (nếu có) | mã - tiền | tên - SĐT
 * - url: deep link ?id= để mở đúng bản ghi
 */

const ORDER_STATUS_TITLE = {
  [orderModel.ORDER_STATUS.PENDING]: '⏳ Đơn đang chờ xử lý',
  [orderModel.ORDER_STATUS.CONFIRMED]: '✅ Đơn đã được xác nhận',
  [orderModel.ORDER_STATUS.DELIVERING]: '🚚 Đơn đang được giao',
  [orderModel.ORDER_STATUS.COMPLETED]: '🎉 Đơn đã giao thành công',
  [orderModel.ORDER_STATUS.CANCELLED]: '❌ Đơn đã bị hủy'
}

const PAYMENT_TITLE = {
  [orderModel.PAYMENT_STATUS.UNPAID]: '🔴 Đơn chưa thanh toán',
  [orderModel.PAYMENT_STATUS.PARTIAL]: '🟡 Thanh toán một phần',
  [orderModel.PAYMENT_STATUS.PAID]: '🟢 Thanh toán thành công'
}

const money = (value) => {
  const amount = Number(value) || 0
  return `${amount.toLocaleString('vi-VN')}đ`
}

const lines = (...parts) =>
  parts.filter((part) => part != null && String(part).trim() !== '').join('\n')

const dash = (...parts) =>
  parts.filter((part) => part != null && String(part).trim() !== '').join(' - ')

const entityId = (doc) => {
  if (!doc) return ''
  if (doc.id) return String(doc.id)
  if (doc._id) return String(doc._id)
  return ''
}

const withId = (path, id) => {
  if (!id) return path
  return `${path}?id=${encodeURIComponent(id)}`
}

const orderHeadline = (order, amount = order?.total) =>
  dash(order?.code || 'Đơn hàng', money(amount))

const personLine = (name, phone) => dash(name, phone)

const orderPerson = (order) =>
  personLine(order?.customerName, order?.customerPhone)

const orderBody = (order, headline) =>
  lines(order?.dealerName || null, headline, orderPerson(order))

const push = (title, body, url, tag) => ({
  title,
  body: body || '',
  url,
  tag
})

export const webPushCopy = {
  pendingOrder: (order) => {
    const id = entityId(order)
    return push(
      '🛒 Bạn có đơn mới',
      orderBody(order, orderHeadline(order)),
      withId('/orders', id),
      id ? `order-${id}` : 'order'
    )
  },

  orderStatus: (order) => {
    const id = entityId(order)
    return push(
      ORDER_STATUS_TITLE[order.status] || '📋 Cập nhật đơn hàng',
      orderBody(order, orderHeadline(order)),
      withId('/orders', id),
      id ? `order-${id}` : 'order'
    )
  },

  paymentReminder: (order) => {
    const id = entityId(order)
    const remaining = Math.max(
      0,
      (Number(order.total) || 0) - (Number(order.paidAmount) || 0)
    )
    return push(
      '💰 Có công nợ cần thu',
      orderBody(order, dash(order.code || 'Đơn', `còn ${money(remaining)}`)),
      withId('/orders', id),
      id ? `debt-${id}` : 'debt'
    )
  },

  paymentUpdate: (order) => {
    const id = entityId(order)
    return push(
      PAYMENT_TITLE[order.paymentStatus] || '💳 Cập nhật thanh toán',
      orderBody(order, orderHeadline(order, order.paidAmount || order.total)),
      withId('/orders', id),
      id ? `payment-${id}` : 'payment'
    )
  },

  newLead: (lead) => {
    const id = entityId(lead)
    return push(
      lead.type === 'dealer' ? '🏪 Có đăng ký đại lý mới' : '📩 Có liên hệ mới',
      lines(personLine(lead.name, lead.phone), lead.company || lead.region),
      withId('/leads', id),
      id ? `lead-${id}` : 'lead'
    )
  },

  pendingDealer: (dealer) => {
    const id = entityId(dealer)
    return push(
      '🏪 Đại lý đang chờ duyệt',
      lines(
        personLine(dealer.name, dealer.phone),
        dealer.contactName && dealer.contactName !== dealer.name
          ? dealer.contactName
          : null,
        dealer.region
      ),
      withId('/dealers', id),
      id ? `dealer-${id}` : 'dealer'
    )
  },

  dealerApproved: (dealer) => {
    const id = entityId(dealer)
    return push(
      '✅ Đại lý đã được duyệt',
      lines(personLine(dealer.name, dealer.phone), dealer.region),
      withId('/dealers', id),
      id ? `dealer-${id}` : 'dealer'
    )
  },

  tripStarted: (trip, stopCount = 0) => {
    const id = entityId(trip)
    return push(
      '🚛 Chuyến giao đã bắt đầu',
      lines(
        trip.code,
        stopCount > 0 ? `${stopCount} điểm giao` : 'Đang trên đường'
      ),
      withId('/trips', id),
      id ? `trip-${id}` : 'trip'
    )
  },

  lowStock: ({ productName, quantity, warehouseName, productId }) => {
    const id = productId ? String(productId) : ''
    return push(
      '⚠️ Sản phẩm sắp hết hàng',
      lines(productName, dash(`Còn ${quantity}`, warehouseName || 'Kho')),
      withId('/inventory', id),
      id ? `stock-${id}` : 'stock'
    )
  }
}
