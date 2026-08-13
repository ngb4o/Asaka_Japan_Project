import {
  COMPANY,
  FONT,
  amountInWords,
  escapeHtml,
  footerBlock,
  formatDate,
  formatVnd,
  infoRow,
  normalizeInvoiceEmail,
  sectionBox,
  td,
  th,
  totalRow
} from '~/services/invoiceEmailService'

function wrapResponsive(title, desktopCard, mobileCard) {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(title)}</title>
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
}

function stampBox(title, codeLine) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #000">
    <tr>
      <td align="center" style="padding:10px 14px;${FONT}">
        <div style="font-size:20px;font-weight:700;letter-spacing:2px;text-transform:uppercase;line-height:1.2">${escapeHtml(title)}</div>
        <div style="margin-top:6px;padding-top:6px;border-top:1px solid #000;font-size:14px;font-weight:700;letter-spacing:0.5px">${escapeHtml(codeLine)}</div>
      </td>
    </tr>
  </table>`
}

function companyBlock() {
  return `<div style="font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;line-height:1.3">${escapeHtml(COMPANY.name)}</div>
              <div style="font-size:11px;font-style:italic;margin-top:2px">${escapeHtml(COMPANY.tagline)}</div>
              <div style="font-size:11px;line-height:1.55;margin-top:6px;word-break:break-word">
                ${escapeHtml(COMPANY.address)}<br />
                ĐT: ${escapeHtml(COMPANY.phone)} — <a href="${COMPANY.websiteUrl}" style="color:#000;text-decoration:none">${escapeHtml(COMPANY.website)}</a>
              </div>`
}

export function buildDebtReminderEmail({ dealer, orders, debtAmount }) {
  const name = dealer.name || 'Quý đại lý'
  const count = orders.length
  const words = amountInWords(debtAmount)
  const stampLine = `${count} đơn · ${formatVnd(debtAmount)}`

  const dealerRows = [
    infoRow('Đại lý', name),
    infoRow('Người liên hệ', dealer.contactName),
    infoRow('SĐT', dealer.phone),
    infoRow('Địa chỉ', dealer.address)
  ].join('')

  const summaryRows = [
    infoRow('Số đơn còn nợ', String(count)),
    infoRow('Tổng còn nợ', formatVnd(debtAmount)),
    infoRow('Ngày nhắc', formatDate(new Date()))
  ].join('')

  const desktopItemRows = orders
    .map(
      (item) => `<tr>
        ${td(escapeHtml(item.code), 'font-weight:600;white-space:nowrap')}
        ${td(escapeHtml(formatDate(item.createdAt)), 'white-space:nowrap')}
        ${td(escapeHtml(formatVnd(item.total)), 'text-align:right;white-space:nowrap')}
        ${td(escapeHtml(formatVnd(item.paidAmount)), 'text-align:right;white-space:nowrap')}
        ${td(escapeHtml(formatVnd(item.remainingAmount)), 'text-align:right;white-space:nowrap;font-weight:700')}
      </tr>`
    )
    .join('')

  const mobileItemRows = orders
    .map(
      (item) => `<tr>
        ${td(
          `<div style="font-weight:600">${escapeHtml(item.code)}</div>
           <div style="font-size:11px;font-weight:400;margin-top:3px">${escapeHtml(formatDate(item.createdAt))} · Tổng ${escapeHtml(formatVnd(item.total))} · Đã thu ${escapeHtml(formatVnd(item.paidAmount))}</div>`,
          '',
          true
        )}
        ${td(escapeHtml(formatVnd(item.remainingAmount)), 'text-align:right;font-weight:700;width:96px', true)}
      </tr>`
    )
    .join('')

  const totals = (fullWidth) =>
    `<table role="presentation" width="${fullWidth ? '100%' : '300'}" cellpadding="0" cellspacing="0" style="width:${fullWidth ? '100%' : '300px'};max-width:100%;border:1px solid #000;border-collapse:collapse;${FONT}">
                ${totalRow('Còn nợ', formatVnd(debtAmount), { grand: true, last: true })}
              </table>
              <div style="margin-top:10px;font-size:12px;font-style:italic;${fullWidth ? 'line-height:1.45;word-break:break-word;' : 'text-align:right;'}${FONT}">
                Bằng chữ: <strong style="font-style:normal;font-weight:700">${escapeHtml(words)}</strong>
              </div>`

  const intro = `Kính gửi <strong>${escapeHtml(name)}</strong>, Asaka Japan xin nhắc công nợ còn lại <strong>${escapeHtml(formatVnd(debtAmount))}</strong> (${count} đơn). Đề nghị quý đại lý sắp xếp thanh toán. Chi tiết như sau:`

  const desktopCard = `
        <table role="presentation" width="720" cellpadding="0" cellspacing="0" style="width:100%;max-width:720px;background:#fff;border:1px solid #000;${FONT}">
          <tr>
            <td style="padding:18px 20px 14px;border-bottom:1px solid #000">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="top" style="padding-right:16px;${FONT}">${companyBlock()}</td>
                  <td valign="top" width="210" align="center" style="width:210px">${stampBox('NHẮC NỢ', stampLine)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 20px 0;font-size:13px;line-height:1.5;${FONT}">${intro}</td>
          </tr>
          <tr>
            <td style="padding:14px 20px 0">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #000;border-collapse:collapse">
                <tr>
                  <td width="50%" valign="top" style="width:50%;padding:10px 12px;border-right:1px solid #000">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding-bottom:4px;margin-bottom:8px;border-bottom:1px solid #000;${FONT}">Thông tin nhắc nợ</div>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${summaryRows}</table>
                  </td>
                  <td width="50%" valign="top" style="width:50%;padding:10px 12px">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding-bottom:4px;margin-bottom:8px;border-bottom:1px solid #000;${FONT}">Đại lý</div>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${dealerRows}</table>
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
                    ${th('Mã đơn', 'text-align:left')}
                    ${th('Ngày', 'text-align:left;width:90px')}
                    ${th('Tổng', 'text-align:right;width:110px')}
                    ${th('Đã thu', 'text-align:right;width:110px')}
                    ${th('Còn nợ', 'text-align:right;width:120px')}
                  </tr>
                </thead>
                <tbody>${desktopItemRows}</tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 20px 0" align="right">${totals(false)}</td>
          </tr>
          <tr>
            <td style="padding:20px 20px 18px;font-size:12px;line-height:1.55;${FONT}">${footerBlock()}</td>
          </tr>
        </table>`

  const mobileCard = `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #000;${FONT}">
          <tr>
            <td style="padding:16px 14px 12px;border-bottom:1px solid #000">
              ${companyBlock()}
              <div style="margin-top:12px">${stampBox('NHẮC NỢ', stampLine)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 14px 0;font-size:13px;line-height:1.5;word-break:break-word;${FONT}">${intro}</td>
          </tr>
          <tr>
            <td style="padding:12px 14px 0">${sectionBox('Thông tin nhắc nợ', summaryRows)}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px 0">${sectionBox('Đại lý', dealerRows)}</td>
          </tr>
          <tr>
            <td style="padding:12px 14px 0">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;table-layout:fixed;${FONT}">
                <thead>
                  <tr>
                    ${th('Đơn hàng', 'text-align:left', true)}
                    ${th('Còn nợ', 'text-align:right;width:96px', true)}
                  </tr>
                </thead>
                <tbody>${mobileItemRows}</tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 14px 0">${totals(true)}</td>
          </tr>
          <tr>
            <td style="padding:16px 14px;font-size:12px;line-height:1.55;word-break:break-word;${FONT}">${footerBlock()}</td>
          </tr>
        </table>`

  const subject = `Nhắc nợ công nợ — ${name} — ASAKA`
  const text = [
    `Kính gửi ${name},`,
    `Asaka Japan xin nhắc công nợ còn lại ${formatVnd(debtAmount)} (${count} đơn).`,
    `Bằng chữ: ${words}`,
    ...orders.map(
      (item) =>
        `- ${item.code}: còn ${formatVnd(item.remainingAmount)} (tổng ${formatVnd(item.total)}, đã thu ${formatVnd(item.paidAmount)})`
    ),
    `Trân trọng, ${COMPANY.name}`
  ].join('\n')

  return {
    subject,
    html: wrapResponsive(`Nhắc nợ ${name}`, desktopCard, mobileCard),
    text
  }
}

export { normalizeInvoiceEmail }
