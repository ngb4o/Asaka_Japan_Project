import { orderModel } from '~/models/orderModel'

const ORDER_STATUS_LABEL = {
  [orderModel.ORDER_STATUS.PENDING]: 'Chờ xử lý',
  [orderModel.ORDER_STATUS.CONFIRMED]: 'Đã xác nhận / xuất kho',
  [orderModel.ORDER_STATUS.DELIVERING]: 'Đang giao',
  [orderModel.ORDER_STATUS.COMPLETED]: 'Hoàn thành',
  [orderModel.ORDER_STATUS.CANCELLED]: 'Đã hủy'
}

const ORDER_STATUS_ICON = {
  [orderModel.ORDER_STATUS.PENDING]: '⏳',
  [orderModel.ORDER_STATUS.CONFIRMED]: '✅',
  [orderModel.ORDER_STATUS.DELIVERING]: '🚚',
  [orderModel.ORDER_STATUS.COMPLETED]: '🎉',
  [orderModel.ORDER_STATUS.CANCELLED]: '❌'
}

const PAYMENT_STATUS_LABEL = {
  [orderModel.PAYMENT_STATUS.UNPAID]: 'Chưa thanh toán',
  [orderModel.PAYMENT_STATUS.PARTIAL]: 'Thanh toán một phần',
  [orderModel.PAYMENT_STATUS.PAID]: 'Đã thanh toán đủ'
}

const PAYMENT_STATUS_ICON = {
  [orderModel.PAYMENT_STATUS.UNPAID]: '🔴',
  [orderModel.PAYMENT_STATUS.PARTIAL]: '🟡',
  [orderModel.PAYMENT_STATUS.PAID]: '🟢'
}

const BOT_LINK = 'https://t.me/asaka_japan_noti_bot'

const DEALER_TIER_LABEL = {
  standard: 'Tiêu chuẩn',
  silver: 'Bạc',
  gold: 'Vàng'
}

const formatDealerTier = (tier) => {
  if (!tier) return ''
  return DEALER_TIER_LABEL[tier] || tier
}

const formatMoney = (value) => {
  const amount = Number(value) || 0
  return `${amount.toLocaleString('vi-VN')} đ`
}

const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('vi-VN')
}

const formatOrderItems = (order) => {
  const items = Array.isArray(order.items) ? order.items : []
  if (!items.length) return null

  const lines = items.map((item, index) => {
    const name = item.productName || 'Sản phẩm'
    const qty = item.quantity || 0
    const lineTotal = formatMoney(item.lineTotal ?? qty * (item.unitPrice || 0))
    return `  ${index + 1}. ${name} × ${qty} — ${lineTotal}`
  })

  return ['📦 Sản phẩm:', ...lines].join('\n')
}

const formatOrderCore = (order) => {
  const statusIcon = ORDER_STATUS_ICON[order.status] || '📋'
  const status = ORDER_STATUS_LABEL[order.status] || order.status
  const paymentIcon = PAYMENT_STATUS_ICON[order.paymentStatus] || '💳'
  const payment = PAYMENT_STATUS_LABEL[order.paymentStatus] || order.paymentStatus
  const remaining = Math.max(0, (Number(order.total) || 0) - (Number(order.paidAmount) || 0))

  const lines = [
    `${statusIcon} Đơn hàng: ${order.code}`,
    `📌 Trạng thái: ${status}`,
    order.customerName ? `👤 Khách: ${order.customerName}` : null,
    order.customerPhone || order.shippingPhone
      ? `📞 SĐT: ${order.shippingPhone || order.customerPhone}`
      : null,
    order.dealerName ? `🏪 Đại lý: ${order.dealerName}` : null,
    order.warehouseName ? `🏭 Kho xuất: ${order.warehouseName}` : null,
    !order.warehouseId && !order.warehouseName ? '🏭 Kho xuất: (chưa chọn)' : null,
    formatOrderItems(order),
    '────────────',
    `💰 Tạm tính: ${formatMoney(order.subtotal)}`,
    Number(order.discount) > 0 ? `🏷️ Chiết khấu: ${formatMoney(order.discount)}` : null,
    Number(order.shippingFee) > 0 ? `📦 Phí ship: ${formatMoney(order.shippingFee)}` : null,
    `💵 Tổng cộng: ${formatMoney(order.total)}`,
    `${paymentIcon} Thanh toán: ${payment}`,
    `💳 Đã thanh toán: ${formatMoney(order.paidAmount)}`,
    remaining > 0 ? `⚠️ Còn lại: ${formatMoney(remaining)}` : '✅ Đã thanh toán đủ'
  ]

  if (order.shippingAddress || order.shippingContactName) {
    lines.push('────────────')
    lines.push('📍 Giao hàng:')
    if (order.shippingContactName) lines.push(`  • Liên hệ: ${order.shippingContactName}`)
    if (order.shippingPhone) lines.push(`  • SĐT nhận: ${order.shippingPhone}`)
    if (order.shippingAddress) lines.push(`  • Địa chỉ: ${order.shippingAddress}`)
  }

  if (order.carrier || order.trackingCode || order.shippingDate || order.deliveredAt) {
    lines.push('────────────')
    lines.push('🚛 Vận chuyển:')
    if (order.carrier) lines.push(`  • Đơn vị: ${order.carrier}`)
    if (order.trackingCode) lines.push(`  • Mã vận đơn: ${order.trackingCode}`)
    if (formatDate(order.shippingDate)) {
      lines.push(`  • Ngày giao: ${formatDate(order.shippingDate)}`)
    }
    if (formatDate(order.deliveredAt)) {
      lines.push(`  • Ngày nhận: ${formatDate(order.deliveredAt)}`)
    }
  }

  if (order.note) {
    lines.push(`📝 Ghi chú: ${order.note}`)
  }

  if (order.shippingNote) {
    lines.push(`📝 Ghi chú giao: ${order.shippingNote}`)
  }

  return lines.filter(Boolean).join('\n')
}

const orderLifecycle = (order) => {
  const statusIcon = ORDER_STATUS_ICON[order.status] || '📋'
  return [
    `${statusIcon} ASAKA CRM — Cập nhật đơn hàng`,
    '',
    formatOrderCore(order),
    '',
    '👉 Nội bộ theo dõi / liên hệ khách hoặc đại lý nếu cần.'
  ].join('\n')
}

const paymentUpdate = (order) => {
  return [
    '💳 ASAKA CRM — Cập nhật thanh toán',
    '',
    formatOrderCore(order),
    order.paymentNote ? `\n📝 Ghi chú TT: ${order.paymentNote}` : '',
    '',
    '👉 Nội bộ kiểm tra công nợ trên CRM.'
  ]
    .filter(Boolean)
    .join('\n')
}

const paymentReminder = (order) => {
  const remaining = Math.max(0, (Number(order.total) || 0) - (Number(order.paidAmount) || 0))

  return [
    '⏰ ASAKA CRM — Nhắc công nợ',
    '',
    formatOrderCore(order),
    '',
    `⚠️ Còn lại: ${formatMoney(remaining)}`,
    '👉 Bấm «Đã thu đủ» bên dưới hoặc ghi nhận trên CRM.'
  ].join('\n')
}

const dealerApproved = (dealer) => {
  return [
    '🎊 ASAKA CRM — Đã duyệt đại lý',
    '',
    `✅ Đại lý ${dealer.name} đã được kích hoạt.`,
    dealer.contactName ? `👤 Liên hệ: ${dealer.contactName}` : null,
    dealer.phone ? `📞 SĐT: ${dealer.phone}` : null,
    dealer.tier ? `🏅 Hạng: ${formatDealerTier(dealer.tier)}` : null,
    '',
    '👉 Nội bộ có thể gọi/Zalo trực tiếp cho đại lý để hỗ trợ.'
  ]
    .filter(Boolean)
    .join('\n')
}

const tripStartedStaff = ({ trip, stops = [] }) => {
  const stopLines = stops.length
    ? stops.map(({ stop, dealer }, index) => {
      const date = formatDate(stop?.date)
      return [
        `  ${index + 1}. ${dealer?.name || stop?.location || 'Điểm dừng'}`,
        dealer?.phone ? `     📞 ${dealer.phone}` : null,
        date ? `     📅 ${date}` : null,
        stop?.location ? `     📍 ${stop.location}` : null
      ]
        .filter(Boolean)
        .join('\n')
    })
    : ['  (Chưa có điểm giao đại lý)']

  return [
    `🚚 ASAKA CRM — Chuyến đang chạy ${trip.code}`,
    '',
    trip.title ? `🗂️ ${trip.title}` : null,
    trip.region ? `🗺️ Khu vực: ${trip.region}` : null,
    '',
    '📍 Điểm giao:',
    ...stopLines,
    '',
    '👉 Nội bộ chủ động gọi đại lý trước khi xe đến.'
  ]
    .filter(Boolean)
    .join('\n')
}

const LEAD_STATUS_LABEL = {
  new: 'Mới',
  contacted: 'Đã liên hệ',
  qualified: 'Tiềm năng',
  converted: 'Đã chuyển đổi',
  closed: 'Đóng'
}

const newLeadStaff = (lead) => {
  const kind = lead.type === 'dealer' ? 'Đăng ký đại lý' : 'Liên hệ mới'
  const icon = lead.type === 'dealer' ? '🏪' : '📩'
  const statusLabel = LEAD_STATUS_LABEL[lead.status] || lead.status || 'Mới'

  return [
    `${icon} ASAKA CRM — ${kind}`,
    '',
    `👤 ${lead.name}`,
    lead.phone ? `📞 SĐT: ${lead.phone}` : null,
    lead.email ? `✉️ Email: ${lead.email}` : null,
    lead.company ? `🏢 Công ty: ${lead.company}` : null,
    lead.region ? `🗺️ Khu vực: ${lead.region}` : null,
    lead.message ? `💬 Nội dung: ${lead.message}` : null,
    `📌 Trạng thái: ${statusLabel}`,
    '',
    '👉 Chọn trạng thái bên dưới (đồng bộ mọi máy staff).'
  ]
    .filter(Boolean)
    .join('\n')
}

const pendingOrderStaff = (order) => {
  const hasWarehouse = Boolean(order.warehouseId || order.warehouseName)

  return [
    '🛒 ASAKA CRM — Đơn hàng chờ xử lý',
    '',
    formatOrderCore(order),
    '',
    hasWarehouse
      ? '👉 Bấm «Xác nhận đơn» để xác nhận + xuất kho.'
      : '⚠️ Đơn chưa chọn kho — mở CRM chọn kho trước, rồi mới xác nhận được.'
  ].join('\n')
}

const pendingQueueStaff = ({ kind, title, detail }) => {
  const icon = kind === 'order' ? '🛒' : '🏪'
  return [
    `${icon} ASAKA CRM — ${title}`,
    '',
    detail,
    '',
    kind === 'order'
      ? '👉 Bấm «Xác nhận đơn» bên dưới (đơn phải đã chọn kho) hoặc mở CRM.'
      : '👉 Bấm «Duyệt đại lý» bên dưới hoặc mở CRM → Đại lý.'
  ].join('\n')
}

const lowStockStaff = ({ productName, quantity, warehouseName }) => {
  return [
    '📉 ASAKA CRM — Sắp hết hàng',
    '',
    `🧪 ${productName} · còn ${quantity}`,
    warehouseName ? `🏭 Kho: ${warehouseName}` : null,
    '',
    'Kiểm tra tồn kho và bổ sung trước mùa vụ.'
  ]
    .filter(Boolean)
    .join('\n')
}

export const telegramTemplates = {
  BOT_LINK,
  LEAD_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  orderLifecycle,
  paymentUpdate,
  paymentReminder,
  dealerApproved,
  tripStartedStaff,
  newLeadStaff,
  pendingOrderStaff,
  pendingQueueStaff,
  lowStockStaff
}
