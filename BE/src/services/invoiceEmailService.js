import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { orderModel } from '~/models/orderModel'
import { isMailConfigured, sendMail } from '~/services/mailService'
import { orderAuditService } from '~/services/orderAuditService'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const PAYMENT_LABELS = {
  unpaid: 'Chưa thanh toán',
  partial: 'Thanh toán một phần',
  paid: 'Đã thanh toán'
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const formatVnd = (value) =>
  `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} ₫`

const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('vi-VN')
}

const unitLabel = (item) => {
  const unit = item.unitType === 'thung' ? 'thùng' : 'chai'
  return `${item.quantity || 0} ${unit}`
}

export function normalizeInvoiceEmail(value) {
  const email = String(value || '').trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) return ''
  return email
}

function buildInvoiceEmail(order) {
  const code = order.code || ''
  const customer = order.dealerName || order.customerName || 'Quý khách'
  const remaining = Math.max(
    0,
    Number(order.remainingAmount ?? (order.total || 0) - (order.paidAmount || 0))
  )
  const rows = (order.items || [])
    .map(
      (item) => `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e8eee9">${escapeHtml(item.productName)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e8eee9;text-align:center">${escapeHtml(unitLabel(item))}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e8eee9;text-align:right">${formatVnd(item.unitPrice)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e8eee9;text-align:right">${formatVnd(item.lineTotal)}</td>
      </tr>`
    )
    .join('')

  const subject = `Hóa đơn ${code} — ASAKA`
  const text = [
    `Kính gửi ${customer},`,
    `ASAKA gửi hóa đơn đơn hàng ${code}.`,
    `Tổng cộng: ${formatVnd(order.total)}`,
    `Đã thu: ${formatVnd(order.paidAmount)}`,
    `Còn lại: ${formatVnd(remaining)}`,
    order.shippingAddress ? `Giao tới: ${order.shippingAddress}` : '',
    'Trân trọng, ASAKA'
  ]
    .filter(Boolean)
    .join('\n')

  const html = `<!doctype html>
<html lang="vi">
<body style="margin:0;padding:24px;background:#f4f7f5;font-family:Arial,Helvetica,sans-serif;color:#122018">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #dce6e0">
    <div style="padding:20px 24px;background:#013a02;color:#fff">
      <div style="font-size:13px;opacity:.8">ASAKA JAPAN</div>
      <div style="font-size:22px;font-weight:700;margin-top:4px">Hóa đơn ${escapeHtml(code)}</div>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 16px">Kính gửi <strong>${escapeHtml(customer)}</strong>,</p>
      <p style="margin:0 0 20px;line-height:1.5">Đơn hàng đã được xác nhận và xuất kho. Chi tiết như sau:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f4f7f5">
            <th style="text-align:left;padding:10px 8px">Sản phẩm</th>
            <th style="text-align:center;padding:10px 8px">SL</th>
            <th style="text-align:right;padding:10px 8px">Đơn giá</th>
            <th style="text-align:right;padding:10px 8px">Thành tiền</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:16px;text-align:right;font-size:14px;line-height:1.7">
        <div>Tạm tính: ${formatVnd(order.subtotal)}</div>
        ${order.discount > 0 ? `<div>Chiết khấu: -${formatVnd(order.discount)}</div>` : ''}
        ${order.shippingFee > 0 ? `<div>Phí vận chuyển: ${formatVnd(order.shippingFee)}</div>` : ''}
        <div style="font-size:16px;font-weight:700;margin-top:6px">Tổng cộng: ${formatVnd(order.total)}</div>
        <div>Thanh toán: ${escapeHtml(PAYMENT_LABELS[order.paymentStatus] || order.paymentStatus || '')}</div>
        <div>Đã thu: ${formatVnd(order.paidAmount)}</div>
        <div>Còn lại: ${formatVnd(remaining)}</div>
      </div>
      ${
        order.shippingAddress
          ? `<p style="margin:20px 0 0;font-size:13px;color:#4a5c54">Giao tới: ${escapeHtml(order.shippingAddress)}</p>`
          : ''
      }
      ${
        order.note
          ? `<p style="margin:8px 0 0;font-size:13px;color:#4a5c54">Ghi chú: ${escapeHtml(order.note)}</p>`
          : ''
      }
      <p style="margin:24px 0 0;font-size:13px;color:#4a5c54">Ngày đơn: ${escapeHtml(formatDate(order.createdAt) || '')}</p>
      <p style="margin:16px 0 0">Trân trọng,<br/><strong>ASAKA</strong></p>
    </div>
  </div>
</body>
</html>`

  return { subject, html, text }
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
