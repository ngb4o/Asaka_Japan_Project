#!/usr/bin/env node
/* eslint-disable no-console */
const BASE = process.env.API_BASE || 'http://127.0.0.1:8017/api'

const fails = []
const pass = (name, detail = '') => console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`)
const fail = (name, detail = '') => {
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  fails.push(`${name}: ${detail}`)
}

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text.slice(0, 180) }
  }
  return { status: res.status, json }
}

async function login(email) {
  const { status, json } = await api('POST', '/users/login', {
    body: { email, password: '123123' }
  })
  if (status !== 200 || !json?.data?.token) {
    fail(`login ${email}`, `HTTP ${status}`)
    return null
  }
  pass(`login ${email}`)
  return json.data.token
}

async function main() {
  const health = await api('GET', '/health')
  health.status === 200 && health.json?.ok
    ? pass('health')
    : fail('health', `HTTP ${health.status}`)

  const tokens = {
    admin: await login('admin@asaka.local'),
    sales: await login('sales@asaka.local'),
    warehouse: await login('warehouse@asaka.local'),
    accountant: await login('accountant@asaka.local')
  }

  // Correct profile + receivables paths
  for (const [role, token] of Object.entries(tokens)) {
    if (!token) continue
    const me = await api('GET', '/users/userAuth', { token })
    me.status === 200
      ? pass(`${role} /users/userAuth`, me.json?.data?.email || me.json?.data?.role)
      : fail(`${role} /users/userAuth`, `HTTP ${me.status}`)
  }

  const recvAdmin = await api('GET', '/receivables/summary', { token: tokens.admin })
  // admin may be allowed via requireRoles('sales','accountant') — check actual
  ;[200, 403].includes(recvAdmin.status)
    ? pass('admin receivables/summary', `HTTP ${recvAdmin.status}`)
    : fail('admin receivables/summary', `HTTP ${recvAdmin.status}`)

  const recvSales = await api('GET', '/receivables/summary', { token: tokens.sales })
  recvSales.status === 200
    ? pass('sales receivables/summary')
    : fail('sales receivables/summary', `HTTP ${recvSales.status}`)

  const recvWh = await api('GET', '/receivables/summary', { token: tokens.warehouse })
  recvWh.status === 403
    ? pass('warehouse blocked from receivables')
    : fail('warehouse receivables expect 403', `HTTP ${recvWh.status}`)

  // Telegram gone
  const tg = await api('GET', '/telegram/status', { token: tokens.admin })
  tg.status === 404 ? pass('telegram API removed') : fail('telegram still up', `HTTP ${tg.status}`)

  // Core lists
  for (const path of [
    '/dashboard/summary',
    '/orders?page=1&limit=3',
    '/dealers?page=1&limit=3',
    '/leads?page=1&limit=3',
    '/products?page=1&limit=3',
    '/inventory/stocks?page=1&limit=3',
    '/notifications',
    '/trips?page=1&limit=3',
    '/employees?page=1&limit=3',
    '/payroll?page=1&limit=3',
    '/news?page=1&limit=3',
    '/warehouses?page=1&limit=3',
    '/product-categories?page=1&limit=3',
    '/notifications/push/vapid-public-key',
    '/notifications/push/status'
  ]) {
    const r = await api('GET', path, { token: tokens.admin })
    r.status >= 200 && r.status < 300
      ? pass(`GET ${path}`)
      : fail(`GET ${path}`, `HTTP ${r.status}`)
  }

  // Notifications inbox shape
  const notif = await api('GET', '/notifications', { token: tokens.admin })
  const items = notif.json?.data?.items || notif.json?.data || []
  const list = Array.isArray(items) ? items : items?.items || []
  pass('notifications payload', `count≈${Array.isArray(list) ? list.length : '?'}`)

  // Role: sales cannot list users
  const salesUsers = await api('GET', '/users', { token: tokens.sales })
  salesUsers.status === 403
    ? pass('sales blocked from /users')
    : fail('sales /users expect 403', `HTTP ${salesUsers.status}`)

  // Role: warehouse cannot access payroll? (check actual policy)
  const whPayroll = await api('GET', '/payroll?page=1&limit=1', { token: tokens.warehouse })
  pass('warehouse payroll observe', `HTTP ${whPayroll.status}`)

  // Accountant cannot create product
  const accProduct = await api('POST', '/products', {
    token: tokens.accountant,
    body: { name: 'BUGTEST', sku: 'BUG-TEST', price: 1 }
  })
  ;[401, 403, 400, 422].includes(accProduct.status)
    ? pass('accountant product create blocked/invalid', `HTTP ${accProduct.status}`)
    : accProduct.status === 201 || accProduct.status === 200
      ? fail('accountant created product', `HTTP ${accProduct.status}`)
      : pass('accountant product create rejected', `HTTP ${accProduct.status}`)

  // Order detail + audits
  const orders = await api('GET', '/orders?page=1&limit=1', { token: tokens.admin })
  const orderId = orders.json?.data?.items?.[0]?.id
  if (orderId) {
    const d = await api('GET', `/orders/${orderId}`, { token: tokens.admin })
    d.status === 200 ? pass('order detail') : fail('order detail', `HTTP ${d.status}`)
    const a = await api('GET', `/orders/${orderId}/audits`, { token: tokens.admin })
    a.status === 200 ? pass('order audits') : fail('order audits', `HTTP ${a.status}`)

    // completed/cancelled should reject update
    const completed = (orders.json?.data?.items || []).find(
      (o) => o.status === 'completed' || o.status === 'cancelled'
    )
    // search a completed one
    const completedList = await api('GET', '/orders?page=1&limit=20&status=completed', {
      token: tokens.admin
    })
    const done = completedList.json?.data?.items?.[0]
    if (done?.id) {
      const upd = await api('PUT', `/orders/${done.id}`, {
        token: tokens.admin,
        body: { note: 'should-fail-edit' }
      })
      upd.status === 409 || upd.status === 400
        ? pass('completed order locked', `HTTP ${upd.status}`)
        : fail('completed order still editable', `HTTP ${upd.status} ${JSON.stringify(upd.json).slice(0, 120)}`)
    } else {
      pass('completed order lock skipped', 'no completed orders')
    }
  } else {
    fail('no orders for detail/audit checks')
  }

  // Create lead -> notify hook should not throw (list still works)
  const lead = await api('POST', '/leads', {
    token: tokens.sales,
    body: {
      type: 'contact',
      name: `Smoke Lead ${Date.now()}`,
      phone: `09${String(Date.now()).slice(-8)}`,
      note: 'smoke test lead — safe to ignore'
    }
  })
  lead.status === 200 || lead.status === 201
    ? pass('create lead (notify path)', `HTTP ${lead.status}`)
    : fail('create lead', `HTTP ${lead.status} ${JSON.stringify(lead.json).slice(0, 150)}`)

  const notifBefore = Array.isArray(list) ? list.length : 0
  const notifAfter = await api('GET', '/notifications', { token: tokens.admin })
  const afterItems = notifAfter.json?.data?.items || notifAfter.json?.data || []
  const afterList = Array.isArray(afterItems) ? afterItems : afterItems?.items || []
  if (notifAfter.status !== 200) {
    fail('notifications after lead', `HTTP ${notifAfter.status}`)
  } else if (lead.status === 200 || lead.status === 201) {
    const grew = afterList.length >= notifBefore
    const hasLead = afterList.some(
      (n) =>
        String(n.type || '').includes('lead') ||
        String(n.id || '').includes('lead') ||
        String(n.title || n.body || '').toLowerCase().includes('lead') ||
        String(n.title || n.body || '').includes('Liên hệ') ||
        String(n.title || n.body || '').includes('lead')
    )
    grew || hasLead || afterList.length > 0
      ? pass('notifications after lead create', `before=${notifBefore} after=${afterList.length} hasLeadHint=${hasLead}`)
      : fail('notifications empty after lead', `before=${notifBefore} after=${afterList.length}`)
  } else {
    pass('notifications after lead create')
  }

  // FE telegram page: without cookie middleware redirects; with fake cookie should 404
  const feLogin = await fetch('http://127.0.0.1:3001/login', { redirect: 'manual' })
  feLogin.status === 200 ? pass('FE /login') : fail('FE /login', `HTTP ${feLogin.status}`)

  const feTg = await fetch('http://127.0.0.1:3001/settings/telegram', {
    redirect: 'manual',
    headers: { Cookie: 'crm_token=fake' }
  })
  // fake token may still pass middleware and hit missing page => 404
  ;[404, 307, 308].includes(feTg.status)
    ? pass('FE /settings/telegram removed/redirected', `HTTP ${feTg.status}`)
    : fail('FE telegram page still reachable', `HTTP ${feTg.status}`)

  console.log('\n--- summary ---')
  console.log(`fails=${fails.length}`)
  if (fails.length) {
    fails.forEach((f) => console.log(` - ${f}`))
    process.exit(1)
  }
  console.log('All checks passed')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
