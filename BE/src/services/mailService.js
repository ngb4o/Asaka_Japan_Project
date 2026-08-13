import { env } from '~/config/environment'

export function isMailConfigured() {
  if (env.RESEND_API_KEY) return true
  if (isGmailApiConfigured()) return true
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)
}

function isGmailApiConfigured() {
  return Boolean(
    env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN
  )
}

function fromAddress() {
  const email = env.MAIL_FROM || env.SMTP_USER || 'noreply@asaka.jp'
  const name = env.MAIL_FROM_NAME || 'ASAKA'
  return { email, name, formatted: `${name} <${email}>` }
}

function encodeRfc2047(value) {
  return `=?UTF-8?B?${Buffer.from(String(value), 'utf8').toString('base64')}?=`
}

function toBase64Url(value) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function buildGmailRaw({ from, to, subject, html, text }) {
  const boundary = `asaka_${Date.now().toString(36)}`
  const plain = text || ''
  const rich = html || plain
  const message = [
    `From: ${from.formatted}`,
    `To: ${to}`,
    `Subject: ${encodeRfc2047(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(plain, 'utf8').toString('base64'),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(rich, 'utf8').toString('base64'),
    `--${boundary}--`
  ].join('\r\n')
  return toBase64Url(message)
}

let gmailAccess = { token: '', expiresAt: 0 }

async function getGmailAccessToken() {
  if (gmailAccess.token && Date.now() < gmailAccess.expiresAt) {
    return gmailAccess.token
  }
  const body = new URLSearchParams({
    client_id: env.GMAIL_CLIENT_ID,
    client_secret: env.GMAIL_CLIENT_SECRET,
    refresh_token: env.GMAIL_REFRESH_TOKEN,
    grant_type: 'refresh_token'
  })
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15_000)
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        `Gmail OAuth ${response.status}`
    )
  }
  gmailAccess = {
    token: payload.access_token,
    expiresAt: Date.now() + Math.max(30, (payload.expires_in || 3600) - 60) * 1000
  }
  return gmailAccess.token
}

async function sendViaGmailApi({ to, subject, html, text }) {
  const from = fromAddress()
  const token = await getGmailAccessToken()
  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: buildGmailRaw({ from, to, subject, html, text })
      }),
      signal: AbortSignal.timeout(20_000)
    }
  )
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      payload.error?.message || payload.message || `Gmail API ${response.status}`
    )
  }
  return { id: payload.id || null }
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
    }),
    signal: AbortSignal.timeout(20_000)
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.message || `Resend ${response.status}`)
  }
  return { id: payload.id || null }
}

function mapSmtpError(error) {
  const msg = error?.message || String(error)
  if (/timeout|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH|ESOCKET/i.test(msg)) {
    return 'Máy chủ hosting chặn SMTP (Render free khóa cổng 587/465). Thêm Gmail API trên Render (GMAIL_CLIENT_ID / SECRET / REFRESH_TOKEN) hoặc nâng gói máy chủ.'
  }
  return msg
}

async function sendViaSmtp({ to, subject, html, text }) {
  const mod = await import('nodemailer')
  const nodemailer = mod.default || mod
  const from = fromAddress()
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT) || 587,
    secure: String(env.SMTP_SECURE || '').toLowerCase() === 'true',
    family: 4,
    connectionTimeout: 12_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  })
  try {
    const info = await transporter.sendMail({
      from: from.formatted,
      to,
      subject,
      html,
      text
    })
    return { id: info.messageId || null }
  } catch (error) {
    throw new Error(mapSmtpError(error))
  }
}

export async function sendMail({ to, subject, html, text }) {
  if (!to) throw new Error('Thiếu địa chỉ email nhận')
  if (env.RESEND_API_KEY) return sendViaResend({ to, subject, html, text })
  if (isGmailApiConfigured()) return sendViaGmailApi({ to, subject, html, text })
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return sendViaSmtp({ to, subject, html, text })
  }
  throw new Error('Chưa cấu hình email máy chủ (SMTP, Gmail API hoặc Resend)')
}
