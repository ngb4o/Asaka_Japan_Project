import { env } from '~/config/environment'

export function isMailConfigured() {
  if (env.RESEND_API_KEY) return true
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)
}

function fromAddress() {
  const email = env.MAIL_FROM || env.SMTP_USER || 'noreply@asaka.jp'
  const name = env.MAIL_FROM_NAME || 'ASAKA'
  return { email, name, formatted: `${name} <${email}>` }
}

async function sendViaResend({ to, subject, html, text }) {
  const from = fromAddress()
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: from.formatted,
      to: [to],
      subject,
      html,
      text
    })
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.message || `Resend ${response.status}`)
  }
  return { id: payload.id || null }
}

async function sendViaSmtp({ to, subject, html, text }) {
  const mod = await import('nodemailer')
  const nodemailer = mod.default || mod
  const from = fromAddress()
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT) || 587,
    secure: String(env.SMTP_SECURE || '').toLowerCase() === 'true',
    // Render/many PaaS have no outbound IPv6 — Gmail AAAA → ENETUNREACH :587
    family: 4,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  })
  const info = await transporter.sendMail({
    from: from.formatted,
    to,
    subject,
    html,
    text
  })
  return { id: info.messageId || null }
}

export async function sendMail({ to, subject, html, text }) {
  if (!to) throw new Error('Thiếu địa chỉ email nhận')
  if (env.RESEND_API_KEY) return sendViaResend({ to, subject, html, text })
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return sendViaSmtp({ to, subject, html, text })
  }
  throw new Error('Chưa cấu hình email máy chủ (SMTP hoặc Resend)')
}
