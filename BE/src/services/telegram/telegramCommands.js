/* eslint-disable no-console */
import { env } from '~/config/environment'
import { orderModel } from '~/models/orderModel'
import { dealerModel } from '~/models/dealerModel'
import { leadModel } from '~/models/leadModel'
import { productModel } from '~/models/productModel'
import { warehouseStockModel } from '~/models/warehouseStockModel'
import { warehouseModel } from '~/models/warehouseModel'
import { telegramContactModel } from '~/models/telegramContactModel'
import { telegramTemplates } from '~/services/telegram/telegramTemplates'
import { telegramKeyboards } from '~/services/telegram/telegramKeyboards'
import { telegramClient } from '~/services/telegram/telegramClient'
import { normalizePhone } from '~/utils/phone'
import { formatDocument } from '~/utils/formatters'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'

const LOW_STOCK_THRESHOLD = 20

const HELP_TEXT = [
  '🤖 ASAKA CRM Bot — lệnh nội bộ',
  '',
  '/help — danh sách lệnh',
  '/id — xem Chat ID của bạn',
  '/don — đơn chờ xử lý (tối đa 10)',
  '/don <mã> — chi tiết đơn (vd: /don O00012)',
  '/dongiao — đơn đang giao (tối đa 10)',
  '/congno — đơn còn nợ (tối đa 10)',
  '/congno <SĐT> — công nợ theo SĐT',
  '/lead — lead mới chưa xử lý',
  '/kho — sắp hết hàng',
  '/kho <SKU hoặc tên> — tìm tồn kho',
  '',
  'Hoặc gửi thẳng mã đơn (vd: O00012).',
  'Tin thông báo đơn có nút: xác nhận, đang giao, hoàn thành, hủy (có xác nhận), thu đủ.',
  'Chỉ nhân sự đã thêm trong CRM / .env mới dùng được lệnh tra cứu.'
].join('\n')

const isStaffChat = async (chatId) => {
  const id = String(chatId)
  if ((env.TELEGRAM_STAFF_CHAT_IDS || []).includes(id)) return true
  const contact = await telegramContactModel.findByChatId(id)
  return contact?.role === telegramContactModel.TELEGRAM_CONTACT_ROLE.STAFF
}

const denyStaff = () =>
  [
    '⛔ Lệnh này chỉ dành cho nội bộ ASAKA.',
    'Nhờ admin thêm Chat ID của bạn tại CRM → Thông báo Telegram.',
    'Chat ID: dùng /id để lấy.'
  ].join('\n')

const enrichOrder = async (order) => {
  if (!order) return null
  const formatted = formatDocument(order)
  let dealerName = ''
  if (order.dealerId) {
    const dealer = await dealerModel.findOneById(order.dealerId)
    dealerName = dealer?.name || ''
  }
  return {
    ...formatted,
    dealerName,
    paidAmount: order.paidAmount ?? 0,
    paymentStatus: order.paymentStatus || orderModel.PAYMENT_STATUS.UNPAID,
    shippingPhone: order.shippingPhone || '',
    shippingAddress: order.shippingAddress || '',
    shippingContactName: order.shippingContactName || '',
    carrier: order.carrier || '',
    trackingCode: order.trackingCode || '',
    shippingFee: order.shippingFee || 0,
    shippingNote: order.shippingNote || '',
    note: order.note || ''
  }
}

const formatMoney = (value) => `${(Number(value) || 0).toLocaleString('vi-VN')} đ`

const cmdHelp = async () => HELP_TEXT

const formatOrderListBlock = (order) => {
  const orderStatus =
    telegramTemplates.ORDER_STATUS_LABEL[order.status] || order.status || '—'
  const paymentStatus =
    telegramTemplates.PAYMENT_STATUS_LABEL[order.paymentStatus] ||
    order.paymentStatus ||
    '—'

  return [
    `🧾 ${order.code}`,
    `👤 Khách: ${order.customerName || '—'}`,
    `📞 SĐT: ${order.shippingPhone || order.customerPhone || '—'}`,
    `📌 Trạng thái đơn: ${orderStatus}`,
    `💳 Thanh toán: ${paymentStatus}`,
    `💵 Tổng: ${formatMoney(order.total)}`
  ].join('\n')
}

const buildOrderListReply = (title, items, footerHint) => {
  const lines = [title, '']
  for (let i = 0; i < items.length; i += 1) {
    if (i > 0) lines.push('')
    lines.push(formatOrderListBlock(items[i]))
  }
  lines.push('', footerHint)
  return lines.join('\n')
}

const cmdDonListPending = async () => {
  let { items } = await orderModel.findMany(
    { status: orderModel.ORDER_STATUS.PENDING },
    { limit: 10, skip: 0, sort: { createdAt: -1 } }
  )

  if (items.length) {
    return buildOrderListReply(
      `⏳ ASAKA CRM — Đơn chờ xử lý (${items.length})`,
      items,
      'Gõ /don <mã> hoặc gửi O00012 để xem chi tiết.'
    )
  }

  const recent = await orderModel.findMany(
    { status: { $ne: orderModel.ORDER_STATUS.CANCELLED } },
    { limit: 10, skip: 0, sort: { createdAt: -1 } }
  )
  items = recent.items

  if (!items.length) {
    return '✅ Chưa có đơn hàng.'
  }

  return buildOrderListReply(
    `🧾 ASAKA CRM — Đơn mới nhất (${items.length})`,
    items,
    'Hiện không còn đơn chờ xử lý.\nGõ /don <mã> hoặc gửi O00012 để xem chi tiết.'
  )
}

const cmdDonDangGiao = async () => {
  const { items } = await orderModel.findMany(
    { status: orderModel.ORDER_STATUS.DELIVERING },
    { limit: 10, skip: 0, sort: { updatedAt: -1, createdAt: -1 } }
  )

  if (!items.length) {
    return '✅ Không có đơn đang giao.'
  }

  return buildOrderListReply(
    `🚚 ASAKA CRM — Đơn đang giao (${items.length})`,
    items,
    'Gõ /don <mã> hoặc gửi O00012 để xem chi tiết.'
  )
}

const cmdDon = async (arg) => {
  const code = (arg || '').trim()
  if (!code) {
    return await cmdDonListPending()
  }

  const order = await orderModel.findOneByCode(code)
  if (!order) {
    return `❌ Không tìm thấy đơn «${code}».`
  }

  const enriched = await enrichOrder(order)
  return {
    reply: telegramTemplates.orderLifecycle(enriched),
    replyMarkup: telegramKeyboards.orderActions(enriched)
  }
}

const buildCongNoReply = async (arg) => {
  const phone = normalizePhone(arg || '')
  const findQuery = {
    paymentStatus: {
      $in: [orderModel.PAYMENT_STATUS.UNPAID, orderModel.PAYMENT_STATUS.PARTIAL]
    },
    status: { $ne: orderModel.ORDER_STATUS.CANCELLED }
  }

  if (phone) {
    const tail = phone.slice(-9)
    findQuery.$or = [
      { customerPhone: { $regex: tail } },
      { shippingPhone: { $regex: tail } }
    ]
  }

  const { items } = await orderModel.findMany(findQuery, {
    limit: 10,
    skip: 0,
    sort: { updatedAt: -1, createdAt: -1 }
  })

  if (!items.length) {
    return {
      reply: phone
        ? `✅ Không có đơn còn nợ cho SĐT ${phone}.`
        : '✅ Hiện không có đơn còn nợ trong danh sách gần đây.'
    }
  }

  const lines = ['💳 ASAKA CRM — Công nợ', '']
  let totalRemaining = 0

  for (let i = 0; i < items.length; i += 1) {
    const order = items[i]
    const remaining = Math.max(0, (Number(order.total) || 0) - (Number(order.paidAmount) || 0))
    totalRemaining += remaining

    const orderStatus =
      telegramTemplates.ORDER_STATUS_LABEL[order.status] || order.status || '—'
    const paymentStatus =
      telegramTemplates.PAYMENT_STATUS_LABEL[order.paymentStatus] ||
      order.paymentStatus ||
      '—'

    if (i > 0) lines.push('')
    lines.push(
      `🧾 ${order.code}`,
      `👤 Khách: ${order.customerName || '—'}`,
      `📞 SĐT: ${order.shippingPhone || order.customerPhone || '—'}`,
      `📌 Trạng thái đơn: ${orderStatus}`,
      `💳 Thanh toán: ${paymentStatus}`,
      `⚠️ Còn lại: ${formatMoney(remaining)}`
    )
  }

  lines.push('', `Σ Tổng còn lại (tối đa ${items.length} đơn): ${formatMoney(totalRemaining)}`)
  if (!phone) lines.push('Gõ /congno 09xxxxxxx để lọc theo SĐT.')

  return {
    reply: lines.join('\n'),
    replyMarkup: telegramKeyboards.congnoPayRows(items)
  }
}

const cmdCongNo = async (arg) => buildCongNoReply(arg)

const cmdLead = async () => {
  const { items } = await leadModel.findMany(
    { status: leadModel.LEAD_STATUS.NEW },
    { limit: 10, skip: 0, sort: { createdAt: -1 } }
  )

  if (!items.length) return '✅ Không có lead mới.'

  const lines = ['📩 ASAKA CRM — Lead mới', '']
  for (const lead of items) {
    const kind = lead.type === leadModel.LEAD_TYPE.DEALER ? 'Đại lý' : 'Liên hệ'
    lines.push(
      `• [${kind}] ${lead.name} · ${lead.phone || '—'}`,
      lead.company || lead.region
        ? `  ${[lead.company, lead.region].filter(Boolean).join(' · ')}`
        : null
    )
  }
  lines.push('', '👉 Xử lý tại CRM → Leads')
  return lines.filter(Boolean).join('\n')
}

const cmdKho = async (arg) => {
  const keyword = (arg || '').trim()

  if (keyword) {
    const products = await productModel.findMany(
      {
        $or: [
          { sku: { $regex: keyword, $options: 'i' } },
          { name: { $regex: keyword, $options: 'i' } }
        ]
      },
      { limit: 10, skip: 0 }
    )

    if (!products.items.length) {
      return `❌ Không tìm thấy sản phẩm «${keyword}».`
    }

    const lines = [`🏭 ASAKA CRM — Tồn kho «${keyword}»`, '']
    for (const product of products.items) {
      const stocks = await warehouseStockModel.findMany(
        { productId: product._id },
        { limit: 20, skip: 0 }
      )
      const total = stocks.items.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)
      lines.push(
        `• ${product.name}${product.sku ? ` (${product.sku})` : ''}`,
        `  Tổng: ${total}${total <= LOW_STOCK_THRESHOLD ? ' ⚠️ sắp hết' : ''}`
      )

      for (const row of stocks.items.slice(0, 3)) {
        const wh = await warehouseModel.findOneById(row.warehouseId)
        lines.push(`  - ${wh?.name || 'Kho'}: ${row.quantity}`)
      }
    }
    return lines.join('\n')
  }

  const { items } = await warehouseStockModel.findMany({}, { limit: 200, skip: 0 })
  const low = items.filter((row) => (Number(row.quantity) || 0) <= LOW_STOCK_THRESHOLD).slice(0, 10)

  if (!low.length) return '✅ Không có SKU nào dưới ngưỡng sắp hết (≤ 20).'

  const productIds = [...new Set(low.map((row) => row.productId.toString()))]
  const products = await GET_DB()
    .collection(productModel.PRODUCT_COLLECTION_NAME)
    .find({ _id: { $in: productIds.map((id) => new ObjectId(id)) } })
    .toArray()
  const productMap = new Map(products.map((p) => [p._id.toString(), p]))

  const lines = ['📉 ASAKA CRM — Sắp hết hàng (≤ 20)', '']
  for (const row of low) {
    const product = productMap.get(row.productId.toString())
    const wh = await warehouseModel.findOneById(row.warehouseId)
    lines.push(
      `• ${product?.name || 'SP'} · còn ${row.quantity}`,
      `  ${wh?.name || 'Kho'}${product?.sku ? ` · ${product.sku}` : ''}`
    )
  }
  lines.push('', 'Gõ /kho <SKU hoặc tên> để tra chi tiết.')
  return lines.join('\n')
}

const wrapStaffReply = (value) => {
  if (value && typeof value === 'object' && value.reply !== undefined) {
    return value
  }
  return { reply: value }
}

/**
 * @returns {Promise<{ handled: boolean, reply?: string }>}
 */
const handleStaffCommand = async (chatId, text) => {
  const trimmed = (text || '').trim()
  if (!trimmed) return { handled: false }

  const staff = await isStaffChat(chatId)

  // Bare order code like O00012
  if (/^O\d{2,}$/i.test(trimmed)) {
    if (!staff) return { handled: true, reply: denyStaff() }
    return { handled: true, ...wrapStaffReply(await cmdDon(trimmed)) }
  }

  const match = trimmed.match(/^\/([a-zA-Z_]+)(?:@\w+)?(?:\s+([\s\S]+))?$/)
  if (!match) return { handled: false }

  const cmd = match[1].toLowerCase()
  const arg = (match[2] || '').trim()

  if (cmd === 'help' || cmd === 'start') {
    // /start with no phone payload is handled separately; help always ok
    if (cmd === 'help') {
      return { handled: true, reply: await cmdHelp() }
    }
    return { handled: false }
  }

  if (cmd === 'id') {
    return { handled: false } // existing handler
  }

  const staffCommands = ['don', 'order', 'dongiao', 'congno', 'lead', 'kho', 'stock']
  if (!staffCommands.includes(cmd)) {
    return { handled: false }
  }

  if (!staff) {
    return { handled: true, reply: denyStaff() }
  }

  switch (cmd) {
  case 'don':
  case 'order':
    return { handled: true, ...wrapStaffReply(await cmdDon(arg)) }
  case 'dongiao':
    return { handled: true, reply: await cmdDonDangGiao() }
  case 'congno':
    return { handled: true, ...wrapStaffReply(await cmdCongNo(arg)) }
  case 'lead':
    return { handled: true, reply: await cmdLead() }
  case 'kho':
  case 'stock':
    return { handled: true, reply: await cmdKho(arg) }
  default:
    return { handled: false }
  }
}

const BOT_COMMANDS = [
  { command: 'help', description: 'Danh sách lệnh' },
  { command: 'id', description: 'Xem Chat ID' },
  { command: 'don', description: 'Đơn chờ / chi tiết đơn' },
  { command: 'dongiao', description: 'Đơn đang giao' },
  { command: 'congno', description: 'Đơn còn nợ' },
  { command: 'lead', description: 'Lead mới' },
  { command: 'kho', description: 'Tồn kho / sắp hết' }
]

const registerBotCommands = async () => {
  return await telegramClient.setMyCommands(BOT_COMMANDS)
}

export const telegramCommands = {
  HELP_TEXT,
  isStaffChat,
  handleStaffCommand,
  registerBotCommands,
  BOT_COMMANDS,
  buildCongNoReply
}
