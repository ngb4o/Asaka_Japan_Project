import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { orderModel } from '~/models/orderModel'
import { isMailConfigured, sendMail } from '~/services/mailService'
import { orderAuditService } from '~/services/orderAuditService'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const COMPANY = {
  name: 'CÔNG TY TNHH ASAKA - JAPAN',
  tagline: 'Giải pháp bảo vệ thực vật',
  address: '1155/35 tỉnh lộ 43, KP 11, phường Tam Bình, TP.HCM',
  phone: '0946 866 068',
  email: 'asakajapan.company@gmail.com',
  website: 'asaka-japan.com',
  websiteUrl: 'https://asaka-japan.com'
}

const STATUS_LABELS = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  delivering: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy'
}

const PAYMENT_LABELS = {
  unpaid: 'Chưa thanh toán',
  partial: 'Thanh toán một phần',
  paid: 'Đã thanh toán'
}

const ONES = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']

export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export const formatVnd = (value) =>
  `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} ₫`

export const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('vi-VN')
}

function readTriple(n, full) {
  const tram = Math.floor(n / 100)
  const chuc = Math.floor((n % 100) / 10)
  const donvi = n % 10
  const parts = []

  if (tram > 0 || full) {
    if (tram > 0) parts.push(`${ONES[tram]} trăm`)
    else if (full && (chuc > 0 || donvi > 0)) parts.push('không trăm')
  }

  if (chuc > 1) {
    parts.push(`${ONES[chuc]} mươi`)
    if (donvi === 1) parts.push('mốt')
    else if (donvi === 5) parts.push('lăm')
    else if (donvi > 0) parts.push(ONES[donvi])
  } else if (chuc === 1) {
    parts.push('mười')
    if (donvi === 5) parts.push('lăm')
    else if (donvi > 0) parts.push(ONES[donvi])
  } else if (donvi > 0) {
    if (full || tram > 0) parts.push(`lẻ ${ONES[donvi]}`)
    else parts.push(ONES[donvi])
  }

  return parts.join(' ')
}

export function amountInWords(amount) {
  const n = Math.round(Math.abs(amount))
  if (n === 0) return 'Không đồng'

  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ']
  const groups = []
  let rest = n
  while (rest > 0) {
    groups.push(rest % 1000)
    rest = Math.floor(rest / 1000)
  }

  const parts = []
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const g = groups[i]
    if (g === 0) continue
    const words = readTriple(g, i < groups.length - 1)
    if (!words) continue
    parts.push(i > 0 ? `${words} ${scales[i]}` : words)
  }

  const text = parts.join(' ').replace(/\s+/g, ' ').trim()
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} đồng`
}

export function normalizeInvoiceEmail(value) {
  const email = String(value || '').trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) return ''
  return email
}

export const FONT =
  "font-family:'Times New Roman',Times,Georgia,serif;color:#000;-webkit-text-size-adjust:100%"

export const th = (label, extra = '', compact = false) =>
  `<th style="border:1px solid #000;background:#fff;color:#000;font-size:${compact ? '11px' : '12px'};font-weight:700;text-transform:uppercase;letter-spacing:${compact ? '0.3px' : '0.4px'};padding:${compact ? '7px 6px' : '8px'};${extra}">${label}</th>`

export const td = (html, extra = '', compact = false) =>
  `<td style="border:1px solid #000;padding:${compact ? '7px 6px' : '8px'};font-size:13px;vertical-align:top;${compact ? 'word-break:break-word;' : ''}${extra}">${html}</td>`

export const infoRow = (label, value, compact = false) =>
  `<tr>
    <td style="padding:2px ${compact ? '8px' : '0'} 2px 0;font-size:12px;width:${compact ? '88px' : '100px'};vertical-align:top;${FONT}">${escapeHtml(label)}</td>
    <td style="padding:2px 0;font-size:12px;font-weight:600;${compact ? 'word-break:break-word;' : ''}${FONT}">${escapeHtml(value || '—')}</td>
  </tr>`

export const totalRow = (label, value, { grand = false, last = false } = {}) =>
  `<tr>
    <td style="padding:${grand ? '8px 10px' : '6px 10px'};font-size:${grand ? '14px' : '12px'};font-weight:${grand ? '700' : '400'};border-bottom:${last ? '0' : '1px solid #000'};${FONT}">${escapeHtml(label)}</td>
    <td style="padding:${grand ? '8px 10px' : '6px 10px'};font-size:${grand ? '15px' : '12px'};font-weight:700;text-align:right;${grand || last ? '' : 'white-space:nowrap;'}border-bottom:${last ? '0' : '1px solid #000'};${FONT}">${escapeHtml(value)}</td>
  </tr>`

export const sectionBox = (title, rows) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #000;border-collapse:collapse">
    <tr>
      <td style="padding:10px 12px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding-bottom:4px;margin-bottom:8px;border-bottom:1px solid #000;${FONT}">${escapeHtml(title)}</div>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%">${rows}</table>
      </td>
    </tr>
  </table>`

const greeting = (customer) =>
  `Kính gửi <strong>${escapeHtml(customer)}</strong>, đơn hàng đã được xác nhận và xuất kho. Chi tiết hóa đơn như sau:`

export const footerBlock = () =>
  `Trân trọng,<br />
              <strong>${escapeHtml(COMPANY.name)}</strong><br />
              <span style="font-size:11px">
                ${escapeHtml(COMPANY.address)} · ĐT: <a href="tel:${COMPANY.phone.replace(/\s/g, '')}" style="color:#000;text-decoration:none">${escapeHtml(COMPANY.phone)}</a>
                · <a href="mailto:${COMPANY.email}" style="color:#000;text-decoration:none">${escapeHtml(COMPANY.email)}</a>
              </span>`

const totalsBlock = (order, extraTotalRows, afterGrandRows, words, { fullWidth = false } = {}) =>
  `<table role="presentation" width="${fullWidth ? '100%' : '300'}" cellpadding="0" cellspacing="0" style="width:${fullWidth ? '100%' : '300px'};max-width:100%;border:1px solid #000;border-collapse:collapse;${FONT}">
                ${totalRow('Tạm tính', formatVnd(order.subtotal))}
                ${extraTotalRows}
                ${totalRow('Tổng cộng', formatVnd(order.total), { grand: true, last: !afterGrandRows })}
                ${afterGrandRows}
              </table>
              <div style="margin-top:10px;font-size:12px;font-style:italic;${fullWidth ? 'line-height:1.45;word-break:break-word;' : 'text-align:right;'}${FONT}">
                Bằng chữ: <strong style="font-style:normal;font-weight:700">${escapeHtml(words)}</strong>
              </div>`

function buildInvoiceEmail(order) {
  const code = order.code || ''
  const customer = order.dealerName || order.customerName || 'Quý khách'
  const paid = Number(order.paidAmount) || 0
  const remaining = Math.max(
    0,
    Number(order.remainingAmount ?? (order.total || 0) - paid)
  )
  const words = amountInWords(order.total)

  const extraTotalRows = [
    order.discount > 0
      ? totalRow('Chiết khấu', `- ${formatVnd(order.discount)}`)
      : '',
    order.shippingFee > 0
      ? totalRow('Phí giao hàng', formatVnd(order.shippingFee))
      : ''
  ].join('')

  const afterGrandRows = [
    paid > 0 ? totalRow('Đã thu', formatVnd(paid)) : '',
    paid > 0 && remaining > 0
      ? totalRow('Còn lại', formatVnd(remaining), { last: true })
      : ''
  ].join('')

  const docRows = [
    infoRow('Trạng thái', STATUS_LABELS[order.status] || order.status),
    infoRow('Thanh toán', PAYMENT_LABELS[order.paymentStatus] || order.paymentStatus),
    infoRow('Kho', order.warehouseName),
    infoRow('Ngày tạo', formatDate(order.createdAt))
  ].join('')

  const customerRows = [
    infoRow('Đại lý/Khách', customer, true),
    infoRow('SĐT', order.customerPhone || order.shippingPhone, true),
    infoRow('Địa chỉ giao', order.shippingAddress, true)
  ].join('')

  const desktopItemRows = (order.items || [])
    .map(
      (item, index) => `<tr>
        ${td(String(index + 1), 'text-align:center;width:44px')}
        ${td(escapeHtml(item.productName || '—'), 'font-weight:600')}
        ${td(String(item.quantity || 0), 'text-align:right;white-space:nowrap;width:70px')}
        ${td(escapeHtml(formatVnd(item.unitPrice)), 'text-align:right;white-space:nowrap;width:120px')}
        ${td(escapeHtml(formatVnd(item.lineTotal)), 'text-align:right;white-space:nowrap;font-weight:700;width:130px')}
      </tr>`
    )
    .join('')

  const mobileItemRows = (order.items || [])
    .map(
      (item, index) => `<tr>
        ${td(
          `<div style="font-weight:600">${index + 1}. ${escapeHtml(item.productName || '—')}</div>
           <div style="font-size:11px;font-weight:400;margin-top:3px">${escapeHtml(formatVnd(item.unitPrice))}/sp</div>`,
          '',
          true
        )}
        ${td(String(item.quantity || 0), 'text-align:center;width:40px', true)}
        ${td(escapeHtml(formatVnd(item.lineTotal)), 'text-align:right;font-weight:700;width:92px', true)}
      </tr>`
    )
    .join('')

  const desktopCard = `
        <table role="presentation" width="720" cellpadding="0" cellspacing="0" style="width:100%;max-width:720px;background:#fff;border:1px solid #000;${FONT}">
          <tr>
            <td style="padding:18px 20px 14px;border-bottom:1px solid #000">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="top" style="padding-right:16px;${FONT}">
                    <div style="font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;line-height:1.3">${escapeHtml(COMPANY.name)}</div>
                    <div style="font-size:11px;font-style:italic;margin-top:2px">${escapeHtml(COMPANY.tagline)}</div>
                    <div style="font-size:11px;line-height:1.55;margin-top:6px">
                      ${escapeHtml(COMPANY.address)}<br />
                      ĐT: ${escapeHtml(COMPANY.phone)} — <a href="${COMPANY.websiteUrl}" style="color:#000;text-decoration:none">${escapeHtml(COMPANY.website)}</a>
                    </div>
                  </td>
                  <td valign="top" width="210" align="center" style="width:210px">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #000">
                      <tr>
                        <td align="center" style="padding:10px 14px;${FONT}">
                          <div style="font-size:20px;font-weight:700;letter-spacing:2px;text-transform:uppercase;line-height:1.2">HÓA ĐƠN</div>
                          <div style="margin-top:6px;padding-top:6px;border-top:1px solid #000;font-size:14px;font-weight:700;letter-spacing:0.5px">Số: ${escapeHtml(code)}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 20px 0;font-size:13px;line-height:1.5;${FONT}">${greeting(customer)}</td>
          </tr>
          <tr>
            <td style="padding:14px 20px 0">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #000;border-collapse:collapse">
                <tr>
                  <td width="50%" valign="top" style="width:50%;padding:10px 12px;border-right:1px solid #000">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding-bottom:4px;margin-bottom:8px;border-bottom:1px solid #000;${FONT}">Thông tin chứng từ</div>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${docRows}</table>
                  </td>
                  <td width="50%" valign="top" style="width:50%;padding:10px 12px">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding-bottom:4px;margin-bottom:8px;border-bottom:1px solid #000;${FONT}">Khách hàng / Đại lý</div>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${customerRows}</table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 20px 0">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;${FONT}">
                <thead>
                  <tr>
                    ${th('STT', 'text-align:center;width:44px')}
                    ${th('Sản phẩm', 'text-align:left')}
                    ${th('SL', 'text-align:right;width:70px')}
                    ${th('Đơn giá', 'text-align:right;width:120px')}
                    ${th('Thành tiền', 'text-align:right;width:130px')}
                  </tr>
                </thead>
                <tbody>${desktopItemRows}</tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 20px 0" align="right">
              ${totalsBlock(order, extraTotalRows, afterGrandRows, words)}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 20px 18px;font-size:12px;line-height:1.55;${FONT}">${footerBlock()}</td>
          </tr>
        </table>`

  const mobileCard = `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #000;${FONT}">
          <tr>
            <td style="padding:16px 14px 12px;border-bottom:1px solid #000">
              <div style="font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;line-height:1.3">${escapeHtml(COMPANY.name)}</div>
              <div style="font-size:11px;font-style:italic;margin-top:2px">${escapeHtml(COMPANY.tagline)}</div>
              <div style="font-size:11px;line-height:1.55;margin-top:6px;word-break:break-word">
                ${escapeHtml(COMPANY.address)}<br />
                ĐT: ${escapeHtml(COMPANY.phone)} — <a href="${COMPANY.websiteUrl}" style="color:#000;text-decoration:none">${escapeHtml(COMPANY.website)}</a>
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin-top:12px;border:1px solid #000">
                <tr>
                  <td align="center" style="padding:10px 12px;${FONT}">
                    <div style="font-size:18px;font-weight:700;letter-spacing:1px;text-transform:uppercase;line-height:1.2">HÓA ĐƠN</div>
                    <div style="margin-top:6px;padding-top:6px;border-top:1px solid #000;font-size:14px;font-weight:700">Số: ${escapeHtml(code)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 14px 0;font-size:13px;line-height:1.5;word-break:break-word;${FONT}">${greeting(customer)}</td>
          </tr>
          <tr>
            <td style="padding:12px 14px 0">${sectionBox('Thông tin chứng từ', docRows)}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px 0">${sectionBox('Khách hàng / Đại lý', customerRows)}</td>
          </tr>
          <tr>
            <td style="padding:12px 14px 0">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;table-layout:fixed;${FONT}">
                <thead>
                  <tr>
                    ${th('Sản phẩm', 'text-align:left', true)}
                    ${th('SL', 'text-align:center;width:40px', true)}
                    ${th('Thành tiền', 'text-align:right;width:92px', true)}
                  </tr>
                </thead>
                <tbody>${mobileItemRows}</tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 14px 0">
              ${totalsBlock(order, extraTotalRows, afterGrandRows, words, { fullWidth: true })}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 14px;font-size:12px;line-height:1.55;word-break:break-word;${FONT}">${footerBlock()}</td>
          </tr>
        </table>`

  const subject = `Hóa đơn ${code} — ASAKA`
  const text = [
    `Kính gửi ${customer},`,
    `${COMPANY.name}`,
    `Trụ sở: ${COMPANY.address}`,
    `ĐT: ${COMPANY.phone}`,
    `Hóa đơn đơn hàng ${code}.`,
    `Tổng cộng: ${formatVnd(order.total)}`,
    `Bằng chữ: ${words}`,
    paid > 0 ? `Đã thu: ${formatVnd(paid)}` : '',
    paid > 0 && remaining > 0 ? `Còn lại: ${formatVnd(remaining)}` : '',
    order.shippingAddress ? `Giao tới: ${order.shippingAddress}` : '',
    `Trân trọng, ${COMPANY.name}`
  ]
    .filter(Boolean)
    .join('\n')

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Hóa đơn ${escapeHtml(code)}</title>
  <style type="text/css">
    .inv-mobile { display: none !important; max-height: 0 !important; overflow: hidden !important; mso-hide: all; }
    @media only screen and (max-width: 620px) {
      .inv-desktop { display: none !important; max-height: 0 !important; overflow: hidden !important; mso-hide: all; }
      .inv-mobile { display: block !important; max-height: none !important; overflow: visible !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f2f2f2;width:100%;${FONT}">
  <div class="inv-desktop">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#f2f2f2;${FONT}">
      <tr>
        <td align="center" style="padding:16px 8px">${desktopCard}</td>
      </tr>
    </table>
  </div>
  <!--[if !mso]><!-->
  <div class="inv-mobile" style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#f2f2f2;${FONT}">
      <tr>
        <td align="center" style="padding:12px 8px">${mobileCard}</td>
      </tr>
    </table>
  </div>
  <!--<![endif]-->
</body>
</html>`

  return {
    subject,
    html,
    text
  }
}

/**
 * @param {'auto'|'manual'} trigger
 */
export async function sendInvoiceEmailForOrder(
  order,
  { actorUserId = null, trigger = 'manual', toEmail } = {}
) {
  const isAuto = trigger === 'auto'
  const orderId = order.id || order._id
  const to = normalizeInvoiceEmail(toEmail || order.customerEmail)

  if (order.status === orderModel.ORDER_STATUS.CANCELLED) {
    if (isAuto) return { sent: false, skipped: 'cancelled' }
    throw new ApiError(StatusCodes.CONFLICT, 'Không gửi hóa đơn cho đơn đã hủy!')
  }

  if (
    order.status === orderModel.ORDER_STATUS.PENDING &&
    !order.inventoryExported
  ) {
    if (isAuto) return { sent: false, skipped: 'pending' }
    throw new ApiError(
      StatusCodes.CONFLICT,
      'Chỉ gửi hóa đơn sau khi đơn đã xác nhận và xuất kho!'
    )
  }

  if (!to) {
    const error = 'Chưa có email khách hàng'
    await orderModel.update(orderId, { invoiceEmailError: error })
    if (isAuto) return { sent: false, skipped: 'no_email' }
    throw new ApiError(StatusCodes.BAD_REQUEST, `${error}. Thêm email rồi gửi lại.`)
  }

  if (!isMailConfigured()) {
    const error = 'Chưa cấu hình email máy chủ (SMTP hoặc Resend)'
    await orderModel.update(orderId, { invoiceEmailError: error })
    if (isAuto) return { sent: false, skipped: 'not_configured' }
    throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, error)
  }

  const payload = buildInvoiceEmail({ ...order, customerEmail: to })

  try {
    await sendMail({ to, ...payload })
  } catch (error) {
    const message = error?.message || 'Không gửi được email'
    await orderModel.update(orderId, { invoiceEmailError: message.slice(0, 500) })
    if (isAuto) return { sent: false, skipped: 'send_failed', error: message }
    throw new ApiError(
      StatusCodes.BAD_GATEWAY,
      `Không gửi được hóa đơn: ${message}`
    )
  }

  const patch = {
    invoiceEmailSentAt: new Date(),
    invoiceEmailSentTo: to,
    invoiceEmailError: ''
  }
  if (toEmail && to !== normalizeInvoiceEmail(order.customerEmail)) {
    patch.customerEmail = to
  }
  await orderModel.update(orderId, patch)

  await orderAuditService.log({
    orderId,
    orderCode: order.code,
    action: orderAuditService.AUDIT_ACTION.INVOICE_EMAILED,
    actorUserId,
    meta: { to, trigger }
  })

  return { sent: true, to }
}
