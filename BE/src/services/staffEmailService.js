import { env } from '~/config/environment'
import { trySendMail } from '~/services/mailService'
import {
  COMPANY,
  amountInWords,
  escapeHtml,
  formatVnd
} from '~/services/invoiceEmailService'

const ROLE_LABELS = {
  admin: 'Quản trị',
  sales: 'Kinh doanh',
  warehouse: 'Kho',
  accountant: 'Kế toán'
}

const SANS =
  "font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#111827;-webkit-text-size-adjust:100%"

const THEMES = {
  welcome: {
    header: '#017d03',
    headerDeep: '#013a02',
    button: '#017d03',
    tint: '#ecfdf3',
    label: '#017d03',
    badge: 'Tài khoản mới'
  },
  reset: {
    header: '#c2410c',
    headerDeep: '#7c2d12',
    button: '#c2410c',
    tint: '#fff7ed',
    label: '#9a3412',
    badge: 'Bảo mật'
  },
  payslip: {
    header: '#0f766e',
    headerDeep: '#134e4a',
    button: '#0f766e',
    tint: '#f0fdfa',
    label: '#0f766e',
    badge: 'Phiếu lương'
  }
}

export function crmLoginUrl() {
  const fromEnv = String(env.CRM_APP_URL || '').trim()
  const fromCors = (env.CORS_ORIGINS || []).find((origin) =>
    /crm|3001/i.test(origin)
  )
  const base = (fromEnv || fromCors || env.CORS_ORIGINS[0] || 'http://localhost:3001')
    .replace(/\/$/, '')
  return `${base}/login`
}

function crmOrigin() {
  return crmLoginUrl().replace(/\/login$/, '')
}

function logoUrl() {
  const origin = crmOrigin()
  if (!origin.startsWith('https://')) return ''
  return `${origin}/images/brand/logo.png`
}

function wrap(title, preheader, card) {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f0;width:100%;${SANS}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#eef2f0;${SANS}">
    <tr>
      <td align="center" style="padding:24px 12px">${card}</td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(href, label, bg) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto">
    <tr>
      <td align="center" bgcolor="${bg}" style="border-radius:10px;background:${bg}">
        <a href="${href}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.2px">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`
}

function kvRow(label, value, { mono = false, last = false, strong = false } = {}) {
  return `<tr>
    <td style="padding:10px 0;${last ? '' : 'border-bottom:1px solid #f3f4f6;'}font-size:12px;color:#6b7280;width:38%;vertical-align:top">${escapeHtml(label)}</td>
    <td style="padding:10px 0;${last ? '' : 'border-bottom:1px solid #f3f4f6;'}font-size:14px;color:#111827;font-weight:${strong ? '700' : '600'};text-align:right;word-break:break-word;${mono ? "font-family:'Courier New',Courier,monospace;letter-spacing:0.3px;" : ''}">${escapeHtml(value)}</td>
  </tr>`
}

function shell(theme, { title, subtitle, body }) {
  const logo = logoUrl()
  return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;${SANS}">
          <tr>
            <td bgcolor="${theme.header}" style="background:linear-gradient(160deg,${theme.header} 0%,${theme.headerDeep} 100%);background-color:${theme.header};padding:28px 28px 24px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    ${
                      logo
                        ? `<img src="${logo}" alt="ASAKA" width="36" height="36" style="display:block;width:36px;height:36px;border-radius:8px;background:#fff;padding:3px;margin-bottom:14px" />`
                        : ''
                    }
                    <div style="display:inline-block;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,0.18);color:#fff;font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase">${escapeHtml(theme.badge)}</div>
                    <div style="margin-top:12px;font-size:24px;font-weight:800;color:#ffffff;line-height:1.25;letter-spacing:-0.3px">${escapeHtml(title)}</div>
                    <div style="margin-top:6px;font-size:13px;color:rgba(255,255,255,0.88);line-height:1.45">${escapeHtml(subtitle)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px">${body}</td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;font-size:12px;line-height:1.55;color:#6b7280">
              ${escapeHtml(COMPANY.name)}<br />
              ${escapeHtml(COMPANY.address)}<br />
              ĐT ${escapeHtml(COMPANY.phone)} · <a href="${COMPANY.websiteUrl}" style="color:${theme.label};text-decoration:none">${escapeHtml(COMPANY.website)}</a>
            </td>
          </tr>
        </table>`
}

function greeting(name, html) {
  return `<p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#374151">
    Xin chào <strong style="color:#111827">${escapeHtml(name)}</strong>, ${html}
  </p>`
}

function hint(text) {
  return `<p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center">${text}</p>`
}

function formatPeriodLabel(period) {
  const [year, month] = String(period || '').split('-')
  if (!year || !month) return period || ''
  return `Tháng ${Number(month)}/${year}`
}

export async function sendAccountCredentialsEmail({
  to,
  name,
  email,
  password,
  roles = [],
  kind = 'create'
}) {
  const loginUrl = crmLoginUrl()
  const isReset = kind === 'reset'
  const theme = isReset ? THEMES.reset : THEMES.welcome
  const roleText = (roles.length ? roles : ['sales'])
    .map((role) => ROLE_LABELS[role] || role)
    .join(', ')

  const credCard = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:${theme.tint};border:1px solid ${isReset ? '#fed7aa' : '#bbf7d0'};border-radius:12px">
    <tr>
      <td style="padding:16px 18px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${kvRow('Email đăng nhập', email, { last: false })}
          ${kvRow('Mật khẩu', password, { mono: true, last: !roleText })}
          ${isReset ? '' : kvRow('Vai trò', roleText, { last: true })}
        </table>
      </td>
    </tr>
  </table>`

  const body = isReset
    ? `${greeting(name, 'quản trị viên đã <strong>đặt lại mật khẩu</strong> tài khoản CRM của bạn. Dùng mật khẩu mới bên dưới để đăng nhập.')}
              ${credCard}
              <div style="height:22px;line-height:22px;font-size:0">&nbsp;</div>
              ${ctaButton(loginUrl, 'Đăng nhập CRM', theme.button)}
              ${hint('Vì lý do bảo mật, hãy đổi mật khẩu ngay sau khi vào hệ thống. Nếu bạn không yêu cầu, liên hệ quản trị viên.')}`
    : `${greeting(name, 'tài khoản CRM <strong>Asaka Japan</strong> đã được tạo. Lưu thông tin đăng nhập và vào hệ thống để bắt đầu làm việc.')}
              ${credCard}
              <div style="height:22px;line-height:22px;font-size:0">&nbsp;</div>
              ${ctaButton(loginUrl, 'Đăng nhập lần đầu', theme.button)}
              ${hint('Đổi mật khẩu ngay sau lần đăng nhập đầu tiên. Không chia sẻ mật khẩu này.')}`

  const html = wrap(
    isReset ? 'Mật khẩu CRM mới' : 'Tài khoản CRM Asaka',
    isReset
      ? `Mật khẩu CRM mới cho ${email}`
      : `Tài khoản CRM đã sẵn sàng — ${email}`,
    shell(theme, {
      title: isReset ? 'Mật khẩu đã được đặt lại' : 'Chào mừng bạn đến CRM',
      subtitle: isReset
        ? 'Đăng nhập bằng mật khẩu mới bên dưới'
        : `${COMPANY.name}`,
      body
    })
  )

  const text = [
    `Xin chào ${name},`,
    isReset
      ? 'Mật khẩu CRM đã được đặt lại.'
      : 'Tài khoản CRM Asaka Japan đã được cấp.',
    `Email: ${email}`,
    `Mật khẩu: ${password}`,
    isReset ? '' : `Vai trò: ${roleText}`,
    `Đăng nhập: ${loginUrl}`,
    'Đổi mật khẩu ngay sau lần đăng nhập đầu.',
    `Trân trọng, ${COMPANY.name}`
  ]
    .filter(Boolean)
    .join('\n')

  return trySendMail({
    to,
    subject: isReset
      ? `Mật khẩu CRM mới — ${name}`
      : `Tài khoản CRM Asaka — ${name}`,
    html,
    text
  })
}

export async function sendPayslipEmail({ to, name, period, line }) {
  const label = formatPeriodLabel(period)
  const net = Number(line.net) || 0
  const words = amountInWords(net)
  const loginUrl = crmLoginUrl()
  const theme = THEMES.payslip

  const breakdown = [
    ['Lương cứng', line.baseSalary],
    ['Phụ cấp', line.allowance],
    [`Hoa hồng (${line.commissionPercent || 0}%)`, line.commission],
    ['Hoàn chuyến', line.tripReimburse]
  ]

  const rows = breakdown
    .map(([key, value], index) =>
      kvRow(key, formatVnd(value), { last: index === breakdown.length - 1 })
    )
    .join('')

  const body = `${greeting(name, `bảng lương <strong>${escapeHtml(label)}</strong> đã được khóa. Đây là phiếu lương của bạn.`)}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:${theme.tint};border-radius:12px;border:1px solid #99f6e4">
                <tr>
                  <td style="padding:18px 20px;text-align:center">
                    <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${theme.label}">Thực nhận</div>
                    <div style="margin-top:6px;font-size:28px;font-weight:800;color:#134e4a;letter-spacing:-0.6px;line-height:1.2">${escapeHtml(formatVnd(net))}</div>
                    <div style="margin-top:6px;font-size:12px;font-style:italic;color:#0f766e">${escapeHtml(words)}</div>
                  </td>
                </tr>
              </table>
              <div style="height:16px;line-height:16px;font-size:0">&nbsp;</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${kvRow('Mã NV', line.employeeCode || '—', { last: false })}
                ${kvRow('Doanh số', formatVnd(line.salesTotal), { last: false })}
                ${rows}
              </table>
              <div style="height:22px;line-height:22px;font-size:0">&nbsp;</div>
              ${ctaButton(loginUrl, 'Xem trên CRM', theme.button)}
              ${hint('Liên hệ kế toán nếu số liệu chưa khớp.')}`

  const html = wrap(
    `Phiếu lương ${label}`,
    `Thực nhận ${formatVnd(net)} — ${label}`,
    shell(theme, {
      title: `Phiếu lương ${label}`,
      subtitle: `${line.employeeCode || ''} · ${name}`.replace(/^ · /, ''),
      body
    })
  )

  const text = [
    `Xin chào ${name},`,
    `Phiếu lương ${label} — ${line.employeeCode || ''}`,
    `Lương cứng: ${formatVnd(line.baseSalary)}`,
    `Phụ cấp: ${formatVnd(line.allowance)}`,
    `Doanh số: ${formatVnd(line.salesTotal)}`,
    `Hoa hồng: ${formatVnd(line.commission)}`,
    `Hoàn chuyến: ${formatVnd(line.tripReimburse)}`,
    `Thực nhận: ${formatVnd(net)} (${words})`,
    `Trân trọng, ${COMPANY.name}`
  ].join('\n')

  return trySendMail({
    to,
    subject: `Phiếu lương ${label} — ${name}`,
    html,
    text
  })
}
