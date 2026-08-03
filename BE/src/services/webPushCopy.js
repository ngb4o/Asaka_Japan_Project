import { orderModel } from '~/models/orderModel'

/**
 * Lock-screen copy:
 * - Title: emoji + câu hành động
 * - Body: mỗi dòng có icon + nhãn (Mã đơn / Số tiền / Đại lý / …)
 * - url: deep link ?detail= / ?id=
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

const EXPENSE_CATEGORY_LABEL = {
  fuel: 'Xăng',
  food: 'Ăn uống',
  lodging: 'Lưu trú',
  toll: 'Cầu đường',
  parking: 'Gửi xe',
  other: 'Khác'
}

const line = (icon, label, value) => {
  if (value == null || String(value).trim() === '') return null
  return `${icon} ${label}: ${String(value).trim()}`
}

const lines = (...parts) =>
  parts.filter((part) => part != null && String(part).trim() !== '').join('\n')

const entityId = (doc) => {
  if (!doc) return ''
  if (doc.id) return String(doc.id)
  if (doc._id) return String(doc._id)
  return ''
}

const withQuery = (path, key, id) => {
  if (!id) return path
  return `${path}?${key}=${encodeURIComponent(id)}`
}

const orderDetailUrl = (order) => withQuery('/orders', 'detail', entityId(order))

const withId = (path, id) => withQuery(path, 'id', id)

const orderBody = (order, { amount, amountLabel = 'Số tiền' } = {}) =>
  lines(
    line('🧾', 'Mã đơn', order?.code),
    line('💰', amountLabel, money(amount ?? order?.total)),
    line('🏪', 'Đại lý', order?.dealerName),
    line('👤', 'Tên', order?.customerName || order?.shippingContactName),
    line('📞', 'SĐT', order?.customerPhone || order?.shippingPhone)
  )

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
      orderBody(order),
      orderDetailUrl(order),
      id ? `order-${id}` : 'order'
    )
  },

  orderDeliveryAssigned: (order) => {
    const id = entityId(order)
    return push(
      '🚚 Bạn được gắn giao đơn',
      orderBody(order),
      orderDetailUrl(order),
      id ? `order-delivery-${id}` : 'order-delivery'
    )
  },

  orderStatus: (order) => {
    const id = entityId(order)
    return push(
      ORDER_STATUS_TITLE[order.status] || '📋 Cập nhật đơn hàng',
      orderBody(order),
      orderDetailUrl(order),
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
      orderBody(order, { amount: remaining, amountLabel: 'Còn nợ' }),
      orderDetailUrl(order),
      id ? `debt-${id}` : 'debt'
    )
  },

  paymentUpdate: (order) => {
    const id = entityId(order)
    return push(
      PAYMENT_TITLE[order.paymentStatus] || '💳 Cập nhật thanh toán',
      orderBody(order, {
        amount: order?.paidAmount || order?.total,
        amountLabel: 'Đã thu'
      }),
      orderDetailUrl(order),
      id ? `payment-${id}` : 'payment'
    )
  },

  newLead: (lead) => {
    const id = entityId(lead)
    return push(
      lead.type === 'dealer' ? '🏪 Có đăng ký đại lý mới' : '📩 Có liên hệ mới',
      lines(
        line('👤', 'Tên', lead.name),
        line('📞', 'SĐT', lead.phone),
        line('🏢', 'Công ty', lead.company),
        line('📍', 'Khu vực', lead.region)
      ),
      withId('/leads', id),
      id ? `lead-${id}` : 'lead'
    )
  },

  pendingDealer: (dealer) => {
    const id = entityId(dealer)
    return push(
      '🏪 Đại lý đang chờ duyệt',
      lines(
        line('🏪', 'Đại lý', dealer.name),
        line('📞', 'SĐT', dealer.phone),
        dealer.contactName && dealer.contactName !== dealer.name
          ? line('👤', 'Liên hệ', dealer.contactName)
          : null,
        line('📍', 'Khu vực', dealer.region)
      ),
      withId('/dealers', id),
      id ? `dealer-${id}` : 'dealer'
    )
  },

  dealerApproved: (dealer) => {
    const id = entityId(dealer)
    return push(
      '✅ Đại lý đã được duyệt',
      lines(
        line('🏪', 'Đại lý', dealer.name),
        line('📞', 'SĐT', dealer.phone),
        line('📍', 'Khu vực', dealer.region)
      ),
      withId('/dealers', id),
      id ? `dealer-${id}` : 'dealer'
    )
  },

  tripCreated: (trip) => {
    const id = entityId(trip)
    const memberNames = Array.isArray(trip.members)
      ? trip.members.map((m) => m.fullName).filter(Boolean).join(', ')
      : ''
    const orderCount = Array.isArray(trip.orders)
      ? trip.orders.length
      : Array.isArray(trip.orderIds)
        ? trip.orderIds.length
        : 0
    return push(
      '🧳 Chuyến công tác mới — cần tạm ứng',
      lines(
        line('🧾', 'Mã chuyến', trip.code),
        line('📍', 'Tuyến', trip.region || trip.title),
        line('👥', 'Người đi', memberNames),
        line('📦', 'Đơn gắn', orderCount > 0 ? `${orderCount} đơn` : null)
      ),
      withId('/trips', id),
      id ? `trip-created-${id}` : 'trip-created'
    )
  },

  tripStarted: (trip, stopCount = 0) => {
    const id = entityId(trip)
    return push(
      '🚛 Chuyến giao đã bắt đầu',
      lines(
        line('🧾', 'Mã chuyến', trip.code),
        line(
          '📍',
          'Điểm giao',
          stopCount > 0 ? `${stopCount} điểm` : 'Đang trên đường'
        )
      ),
      withId('/trips', id),
      id ? `trip-${id}` : 'trip'
    )
  },

  tripAdvance: (trip, advance = {}) => {
    const id = entityId(trip)
    return push(
      '💵 Đã ghi tạm ứng chuyến',
      lines(
        line('🧾', 'Mã chuyến', trip.code),
        line('💰', 'Số tiền ứng', money(advance.amount)),
        line('📝', 'Ghi chú', advance.note)
      ),
      withId('/trips', id),
      id ? `trip-advance-${id}-${advance.id || Date.now()}` : 'trip-advance'
    )
  },

  tripExpensePending: (trip, expense = {}) => {
    const id = entityId(trip)
    const category =
      EXPENSE_CATEGORY_LABEL[expense.category] || expense.category || 'Chi phí'
    return push(
      '🧾 Chi phí chuyến chờ duyệt',
      lines(
        line('🧾', 'Mã chuyến', trip.code),
        line('📂', 'Loại', category),
        line('💰', 'Số tiền', money(expense.amount)),
        line('📝', 'Ghi chú', expense.note)
      ),
      withId('/trips', id),
      id
        ? `trip-expense-pending-${id}-${expense.id || Date.now()}`
        : 'trip-expense-pending'
    )
  },

  tripExpenseReviewed: (trip, expense = {}, status) => {
    const id = entityId(trip)
    const approved = status === 'approved'
    const category =
      EXPENSE_CATEGORY_LABEL[expense.category] || expense.category || 'Chi phí'
    return push(
      approved ? '✅ Chi phí chuyến đã được duyệt' : '❌ Chi phí chuyến bị từ chối',
      lines(
        line('🧾', 'Mã chuyến', trip.code),
        line('📂', 'Loại', category),
        line('💰', 'Số tiền', money(expense.amount)),
        line('📝', 'Ghi chú', expense.note)
      ),
      withId('/trips', id),
      id
        ? `trip-expense-${id}-${expense.id || Date.now()}-${status}`
        : `trip-expense-${status}`
    )
  },

  tripSettled: (trip, settlement = {}) => {
    const id = entityId(trip)
    return push(
      '🔒 Chuyến đã quyết toán',
      lines(
        line('🧾', 'Mã chuyến', trip.code),
        line('💵', 'Tổng ứng', money(settlement.advanceTotal)),
        line('💸', 'Cty trả NV', money(settlement.companyPay)),
        line('📥', 'NV nộp lại', money(settlement.employeeReturn))
      ),
      withId('/trips', id),
      id ? `trip-settled-${id}` : 'trip-settled'
    )
  },

  lowStock: ({ productName, quantity, warehouseName, productId }) => {
    const id = productId ? String(productId) : ''
    return push(
      '⚠️ Sản phẩm sắp hết hàng',
      lines(
        line('📦', 'Sản phẩm', productName),
        line('📊', 'Tồn kho', quantity),
        line('🏭', 'Kho', warehouseName || 'Kho')
      ),
      withId('/inventory', id),
      id ? `stock-${id}` : 'stock'
    )
  }
}
