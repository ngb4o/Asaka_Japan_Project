/**
 * Lấy GMAIL_REFRESH_TOKEN để gửi mail qua Gmail API (HTTPS) — Render free chặn SMTP.
 *
 * Trước khi chạy:
 * 1. https://console.cloud.google.com/ → project
 * 2. APIs & Services → Enable "Gmail API"
 * 3. OAuth consent screen (External, test user = email gửi hóa đơn)
 * 4. Credentials → Create OAuth client → Application type: Desktop app
 * 5. Thêm redirect URI: http://127.0.0.1:53682/oauth2callback
 *
 * Usage (from BE/): npm run gmail-oauth
 */
require('dotenv').config()
const http = require('http')
const { URL } = require('url')

const PORT = 53682
const REDIRECT = `http://127.0.0.1:${PORT}/oauth2callback`
const SCOPE = 'https://www.googleapis.com/auth/gmail.send'

const clientId = String(process.env.GMAIL_CLIENT_ID || '').trim()
const clientSecret = String(process.env.GMAIL_CLIENT_SECRET || '').trim()

if (!clientId || !clientSecret) {
  console.error(`
Thiếu GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET trong BE/.env

Tạo OAuth Desktop client trên Google Cloud, dán 2 giá trị vào .env, chạy lại:
  npm run gmail-oauth

Redirect URI bắt buộc:
  ${REDIRECT}
`)
  process.exit(1)
}

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
authUrl.searchParams.set('client_id', clientId)
authUrl.searchParams.set('redirect_uri', REDIRECT)
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('scope', SCOPE)
authUrl.searchParams.set('access_type', 'offline')
authUrl.searchParams.set('prompt', 'consent')
authUrl.searchParams.set('login_hint', process.env.SMTP_USER || '')

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url, `http://127.0.0.1:${PORT}`)
    if (reqUrl.pathname !== '/oauth2callback') {
      res.writeHead(404)
      res.end('Not found')
      return
    }
    const err = reqUrl.searchParams.get('error')
    const code = reqUrl.searchParams.get('code')
    if (err || !code) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(`OAuth lỗi: ${err || 'thiếu code'}`)
      server.close()
      process.exit(1)
      return
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT,
        grant_type: 'authorization_code'
      })
    })
    const payload = await tokenRes.json()
    if (!payload.refresh_token) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(
        `Không có refresh_token. Xem terminal.\n${JSON.stringify(payload)}`
      )
      console.error(payload)
      server.close()
      process.exit(1)
      return
    }

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('OK — copy GMAIL_REFRESH_TOKEN từ terminal, dán vào Render. Có thể đóng tab.')
    console.log(`
GMAIL_REFRESH_TOKEN=${payload.refresh_token}

Dán 3 biến này lên Render (Environment):
  GMAIL_CLIENT_ID=${clientId}
  GMAIL_CLIENT_SECRET=${clientSecret}
  GMAIL_REFRESH_TOKEN=${payload.refresh_token}

Rồi redeploy BE. Local vẫn dùng SMTP như cũ.
`)
    server.close()
    process.exit(0)
  } catch (error) {
    console.error(error)
    res.writeHead(500)
    res.end(String(error?.message || error))
    server.close()
    process.exit(1)
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`
Mở URL này, đăng nhập đúng Gmail gửi hóa đơn (${process.env.SMTP_USER || 'SMTP_USER'}):

${authUrl.toString()}
`)
})
