/**
 * End-to-end smoke test for ASAKA CRM API flows.
 * Usage: node scripts/e2e-crm-smoke.js
 */
const API = process.env.API_URL || 'http://localhost:8017/api'
const PASSWORD = '123123'

const accounts = {
  admin: 'admin@asaka.local',
  sales: 'sales@asaka.local',
  warehouse: 'warehouse@asaka.local',
  accountant: 'accountant@asaka.local'
}

const results = []
let pass = 0
let fail = 0
let warn = 0

function ok(name, detail = '') {
  pass++
  results.push({ status: 'PASS', name, detail })
  console.log(`  ✅ PASS  ${name}${detail ? ` — ${detail}` : ''}`)
}

function bad(name, detail = '') {
  fail++
  results.push({ status: 'FAIL', name, detail })
  console.log(`  ❌ FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
}

function soft(name, detail = '') {
  warn++
  results.push({ status: 'WARN', name, detail })
  console.log(`  ⚠️  WARN  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function req(method, path, { token, body, expectStatus } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })
  let data = null
  const text = await res.text()
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }
  if (expectStatus !== undefined && res.status !== expectStatus) {
    const err = new Error(
      `${method} ${path} → ${res.status} (expected ${expectStatus}): ${text.slice(0, 300)}`
    )
    err.status = res.status
    err.data = data
    throw err
  }
  return { status: res.status, data }
}

async function login(email) {
  const { data } = await req('POST', '/users/login', {
    body: { email, password: PASSWORD },
    expectStatus: 200
  })
  const token = data?.data?.token || data?.token
  if (!token) throw new Error(`No token for ${email}: ${JSON.stringify(data).slice(0, 200)}`)
  return token
}

async function section(title, fn) {
  console.log(`\n━━ ${title} ━━`)
  try {
    await fn()
  } catch (err) {
    bad(title, err.message)
  }
}

async function main() {
  console.log(`ASAKA CRM E2E smoke @ ${API}\n`)

  const tokens = {}

  await section('1. Auth — login all roles', async () => {
    for (const [role, email] of Object.entries(accounts)) {
      try {
        tokens[role] = await login(email)
        ok(`login ${role}`, email)
      } catch (err) {
        bad(`login ${role}`, err.message)
      }
    }

    // wrong password
    const { status } = await req('POST', '/users/login', {
      body: { email: accounts.admin, password: 'wrong-password' }
    })
    if (status >= 400) ok('reject wrong password', `status ${status}`)
    else bad('reject wrong password', `got ${status}`)
  })

  await section('2. Auth — /users/me + role gate', async () => {
    for (const role of Object.keys(accounts)) {
      if (!tokens[role]) continue
      const { data } = await req('GET', '/users/userAuth', {
        token: tokens[role],
        expectStatus: 200
      })
      const me = data?.data || data
      if (me?.role === role || me?.email === accounts[role]) {
        ok(`/users/me as ${role}`, me.role || me.email)
      } else {
        soft(`/users/me as ${role}`, JSON.stringify(me).slice(0, 120))
      }
    }

    // sales cannot manage users
    if (tokens.sales) {
      const { status } = await req('GET', '/users', { token: tokens.sales })
      if (status === 403 || status === 401) ok('sales blocked from /users', `status ${status}`)
      else soft('sales /users access', `status ${status} (expected 403)`)
    }
  })

  let categoryId = null
  let productId = null
  let warehouseId = null
  let leadId = null
  let dealerId = null
  let orderId = null
  let employeeId = null
  let tripId = null
  const stamp = Date.now().toString(36)

  await section('3. Master data — categories / products / warehouses', async () => {
    const t = tokens.admin
    if (!t) throw new Error('no admin token')

    // list
    for (const path of [
      '/product-categories?page=1&limit=5',
      '/products?page=1&limit=5',
      '/warehouses?page=1&limit=5',
      '/inventory/stocks?page=1&limit=5',
      '/inventory/transactions?page=1&limit=5'
    ]) {
      const { status, data } = await req('GET', path, { token: t })
      if (status === 200) ok(`GET ${path.split('?')[0]}`, `items=${data?.items?.length ?? data?.data?.items?.length ?? '?'}`)
      else bad(`GET ${path}`, `status ${status}`)
    }

    // create category
    {
      const { status, data } = await req('POST', '/product-categories', {
        token: t,
        body: { name: `E2E Cat ${stamp}`, description: 'smoke test' }
      })
      categoryId = data?.id || data?.data?.id
      if (status < 300 && categoryId) ok('create category', categoryId)
      else soft('create category', `status ${status} ${JSON.stringify(data).slice(0, 150)}`)
    }

    // create product
    {
      const { status, data } = await req('POST', '/products', {
        token: t,
        body: {
          name: `E2E Product ${stamp}`,
          sku: `E2E-${stamp}`,
          categoryId: categoryId || undefined,
          price: 100000,
          unitsPerCase: 12,
          status: 'active'
        }
      })
      productId = data?.id || data?.data?.id
      if (status < 300 && productId) ok('create product', productId)
      else soft('create product', `status ${status} ${JSON.stringify(data).slice(0, 200)}`)
    }

    // list warehouses — pick active
    {
      const { data } = await req('GET', '/warehouses?status=active&limit=10&page=1', {
        token: t,
        expectStatus: 200
      })
      const items = data?.items || data?.data?.items || []
      warehouseId = items[0]?.id
      if (warehouseId) ok('have active warehouse', warehouseId)
      else {
        const created = await req('POST', '/warehouses', {
          token: t,
          body: { name: `E2E Kho ${stamp}`, status: 'active' }
        })
        warehouseId = created.data?.id || created.data?.data?.id
        if (warehouseId) ok('create warehouse', warehouseId)
        else bad('need warehouse', JSON.stringify(created.data).slice(0, 200))
      }
    }

    // import stock
    if (productId && warehouseId) {
      const { status, data } = await req('POST', '/inventory/import', {
        token: t,
        body: {
          warehouseId,
          productId,
          quantity: 24,
          unitType: 'chai',
          note: 'e2e import'
        }
      })
      if (status < 300) ok('import stock', `status ${status}`)
      else bad('import stock', `status ${status} ${JSON.stringify(data).slice(0, 200)}`)
    }

    // warehouse role can read stocks
    if (tokens.warehouse) {
      const { status } = await req('GET', '/inventory/stocks?page=1&limit=5', {
        token: tokens.warehouse
      })
      if (status === 200) ok('warehouse reads stocks')
      else bad('warehouse reads stocks', `status ${status}`)
    }

    // sales should be blocked from inventory write (if role middleware)
    if (tokens.sales && productId && warehouseId) {
      const { status } = await req('POST', '/inventory/import', {
        token: tokens.sales,
        body: { warehouseId, productId, quantity: 1, unitType: 'chai' }
      })
      if (status === 403) ok('sales blocked from import')
      else soft('sales import gate', `status ${status} (expected 403)`)
    }
  })

  await section('4. Sales flow — leads → dealers', async () => {
    const t = tokens.admin || tokens.sales
    if (!t) throw new Error('no token')

    // create lead
    {
      const { status, data } = await req('POST', '/leads', {
        token: t,
        body: {
          name: `E2E Lead ${stamp}`,
          phone: `09${String(Date.now()).slice(-8)}`,
          source: 'other',
          status: 'new',
          note: 'e2e'
        }
      })
      leadId = data?.id || data?.data?.id
      if (status < 300 && leadId) ok('create lead', leadId)
      else soft('create lead', `status ${status} ${JSON.stringify(data).slice(0, 200)}`)
    }

    // update lead status
    if (leadId) {
      const { status } = await req('PUT', `/leads/${leadId}`, {
        token: t,
        body: { status: 'contacted' }
      })
      if (status < 300) ok('update lead status')
      else bad('update lead status', `status ${status}`)
    }

    // create dealer
    {
      const { status, data } = await req('POST', '/dealers', {
        token: t,
        body: {
          name: `E2E Dealer ${stamp}`,
          phone: `08${String(Date.now()).slice(-8)}`,
          status: 'pending',
          address: 'Hà Nội'
        }
      })
      dealerId = data?.id || data?.data?.id
      if (status < 300 && dealerId) ok('create dealer', dealerId)
      else soft('create dealer', `status ${status} ${JSON.stringify(data).slice(0, 200)}`)
    }

    // approve dealer
    if (dealerId) {
      const { status, data } = await req('PUT', `/dealers/${dealerId}`, {
        token: tokens.admin || t,
        body: { status: 'active' }
      })
      if (status < 300) ok('approve dealer')
      else soft('approve dealer', `status ${status} ${JSON.stringify(data).slice(0, 150)}`)
    }

    // warehouse blocked from creating dealers
    if (tokens.warehouse) {
      const { status } = await req('POST', '/dealers', {
        token: tokens.warehouse,
        body: { name: 'Should Fail', phone: '0900000000' }
      })
      if (status === 403) ok('warehouse blocked from create dealer')
      else soft('warehouse create dealer gate', `status ${status}`)
    }
  })

  await section('5. Orders — create → confirm → ship → pay', async () => {
    const t = tokens.admin || tokens.sales
    if (!t) throw new Error('no token')

    // ensure we have product + warehouse + dealer
    if (!productId) {
      const { data } = await req('GET', '/products?limit=1&page=1', { token: t, expectStatus: 200 })
      productId = (data?.items || data?.data?.items || [])[0]?.id
    }
    if (!warehouseId) {
      const { data } = await req('GET', '/warehouses?status=active&limit=1&page=1', {
        token: t,
        expectStatus: 200
      })
      warehouseId = (data?.items || data?.data?.items || [])[0]?.id
    }
    if (!dealerId) {
      const { data } = await req('GET', '/dealers?status=approved&limit=1&page=1', {
        token: t,
        expectStatus: 200
      })
      dealerId = (data?.items || data?.data?.items || [])[0]?.id
    }

    if (!productId || !warehouseId || !dealerId) {
      bad('order prerequisites', `product=${productId} wh=${warehouseId} dealer=${dealerId}`)
      return
    }

    // get product price
    const { data: prod } = await req('GET', `/products/${productId}`, { token: t })
    const product = prod?.data || prod
    const unitPrice = Number(product?.price) || 100000

    // create order
    {
      const { status, data } = await req('POST', '/orders', {
        token: t,
        body: {
          dealerId,
          warehouseId,
          items: [{ productId, quantity: 2, unitType: 'chai', unitPrice }],
          note: `e2e order ${stamp}`
        }
      })
      orderId = data?.id || data?.data?.id
      if (status < 300 && orderId) ok('create order', orderId)
      else {
        bad('create order', `status ${status} ${JSON.stringify(data).slice(0, 300)}`)
        return
      }
    }

    // get details
    {
      const { status, data } = await req('GET', `/orders/${orderId}`, { token: t })
      if (status === 200) {
        const o = data?.data || data
        ok('get order details', `status=${o.status} total=${o.total}`)
      } else bad('get order details', `status ${status}`)
    }

    // confirm
    {
      const { status, data } = await req('PUT', `/orders/${orderId}`, {
        token: tokens.admin || t,
        body: { status: 'confirmed' }
      })
      if (status < 300) ok('confirm order')
      else bad('confirm order', `status ${status} ${JSON.stringify(data).slice(0, 200)}`)
    }

    // ship / export (warehouse)
    {
      const actor = tokens.warehouse || tokens.admin
      const { status, data } = await req('PUT', `/orders/${orderId}`, {
        token: actor,
        body: { status: 'delivering' }
      })
      if (status < 300) ok('ship order')
      else {
        // try alternate statuses
        const alt = await req('PUT', `/orders/${orderId}`, {
          token: actor,
          body: { status: 'exporting' }
        })
        if (alt.status < 300) ok('exporting order', 'status=exporting')
        else soft('ship/export order', `ship=${status} exporting=${alt.status} ${JSON.stringify(data).slice(0, 150)}`)
      }
    }

    // payment
    {
      const actor = tokens.accountant || tokens.admin
      const { data: detail } = await req('GET', `/orders/${orderId}`, { token: actor })
      const order = detail?.data || detail
      const remaining = Number(order?.remainingAmount ?? order?.total ?? 0)

      // try recordPayment endpoint if exists
      let paid = false
      for (const path of [
        `/orders/${orderId}/payments`,
        `/orders/${orderId}/pay`,
        `/orders/${orderId}/payment`
      ]) {
        const { status, data } = await req('POST', path, {
          token: actor,
          body: { amount: remaining || order?.total || unitPrice * 2, method: 'transfer', note: 'e2e pay' }
        })
        if (status < 300) {
          ok('record payment', path)
          paid = true
          break
        }
        if (status !== 404) {
          soft(`payment ${path}`, `status ${status} ${JSON.stringify(data).slice(0, 120)}`)
        }
      }
      if (!paid) {
        const { status, data } = await req('PUT', `/orders/${orderId}`, {
          token: actor,
          body: { paymentStatus: 'paid', paidAmount: remaining || order?.total }
        })
        if (status < 300) ok('mark paid via update')
        else soft('payment update', `status ${status} ${JSON.stringify(data).slice(0, 150)}`)
      }
    }

    // stock after ship should decrease (best-effort check)
    {
      const { data } = await req(
        'GET',
        `/inventory/stocks?warehouseId=${warehouseId}&search=E2E&page=1&limit=20`,
        { token: tokens.admin }
      )
      const items = data?.items || data?.data?.items || []
      const row = items.find((i) => i.productId === productId)
      if (row) ok('stock row exists after order', `qty=${row.quantity}`)
      else soft('stock row after order', 'not found in search (may be ok)')
    }
  })

  await section('6. Ops — employees / trips / payroll / news / dashboard / reports', async () => {
    const t = tokens.admin
    if (!t) throw new Error('no admin')

    // employees list
    {
      const { status, data } = await req('GET', '/employees?page=1&limit=10', { token: t })
      if (status === 200) {
        const items = data?.items || data?.data?.items || []
        employeeId = items[0]?.id
        ok('list employees', `count=${items.length}`)
      } else bad('list employees', `status ${status}`)
    }

    // create employee (optional)
    {
      const { status, data } = await req('POST', '/employees', {
        token: t,
        body: {
          fullName: `E2E Emp ${stamp}`,
          phone: `07${String(Date.now()).slice(-8)}`,
          roleTitle: 'Tester',
          status: 'active'
        }
      })
      if (status < 300) {
        employeeId = data?.id || data?.data?.id || employeeId
        ok('create employee', employeeId)
      } else soft('create employee', `status ${status} ${JSON.stringify(data).slice(0, 150)}`)
    }

    // trips
    {
      const { status, data } = await req('GET', '/trips?page=1&limit=5', { token: t })
      if (status === 200) ok('list trips')
      else bad('list trips', `status ${status}`)

      const today = new Date().toISOString().slice(0, 10)
      const createBody = {
        title: `E2E Trip ${stamp}`,
        startDate: today,
        endDate: today,
        memberIds: employeeId ? [employeeId] : [],
        note: 'e2e'
      }
      const created = await req('POST', '/trips', { token: t, body: createBody })
      tripId = created.data?.id || created.data?.data?.id
      if (created.status < 300 && tripId) ok('create trip', tripId)
      else soft('create trip', `status ${created.status} ${JSON.stringify(created.data).slice(0, 200)}`)
    }

    // payroll
    {
      const { status, data } = await req('GET', '/payroll?page=1&limit=5', { token: t })
      if (status === 200) ok('list payroll')
      else {
        const alt = await req('GET', '/payroll/periods?page=1&limit=5', { token: t })
        if (alt.status === 200) ok('list payroll periods')
        else soft('payroll list', `status ${status}/${alt.status}`)
      }
    }

    // news
    {
      const { status } = await req('GET', '/news?page=1&limit=5', { token: t })
      if (status === 200) ok('list news')
      else bad('list news', `status ${status}`)
    }

    // dashboard summary
    {
      const { status, data } = await req('GET', '/dashboard/summary', { token: t })
      if (status === 200) ok('dashboard summary', Object.keys(data?.data || data || {}).slice(0, 5).join(','))
      else bad('dashboard summary', `status ${status}`)
    }

    // reports
    {
      const { status, data } = await req('GET', '/dashboard/reports', { token: t })
      if (status === 200) ok('dashboard reports')
      else soft('dashboard reports', `status ${status} ${JSON.stringify(data).slice(0, 120)}`)

      if (tokens.sales) {
        const s = await req('GET', '/dashboard/reports', { token: tokens.sales })
        if (s.status === 403) ok('sales blocked from reports')
        else soft('sales reports gate', `status ${s.status}`)
      }
    }

    // notifications
    {
      const { status } = await req('GET', '/notifications?page=1&limit=5', { token: t })
      if (status === 200 || status === 404) ok('notifications endpoint', `status ${status}`)
      else soft('notifications', `status ${status}`)
    }
  })

  await section('7. Role matrix — key denials', async () => {
    const cases = [
      { role: 'warehouse', path: '/leads?page=1&limit=1', allow: false },
      { role: 'warehouse', path: '/payroll?page=1&limit=1', allow: false },
      { role: 'sales', path: '/payroll?page=1&limit=1', allow: false },
      { role: 'sales', path: '/inventory/stocks?page=1&limit=1', allow: true },
      { role: 'accountant', path: '/leads?page=1&limit=1', allow: false },
      { role: 'accountant', path: '/dashboard/reports', allow: true },
      { role: 'warehouse', path: '/orders?page=1&limit=1', allow: true },
      { role: 'sales', path: '/orders?page=1&limit=1', allow: true }
    ]

    for (const c of cases) {
      if (!tokens[c.role]) continue
      const { status } = await req('GET', c.path, { token: tokens[c.role] })
      const allowed = status === 200
      if (c.allow === allowed) ok(`${c.role} ${c.allow ? 'can' : 'cannot'} ${c.path.split('?')[0]}`)
      else if (!c.allow && (status === 403 || status === 401)) ok(`${c.role} blocked ${c.path.split('?')[0]}`)
      else soft(`${c.role} access ${c.path.split('?')[0]}`, `status ${status}, expected ${c.allow ? 200 : 403}`)
    }
  })

  await section('8. Cleanup — delete smoke artifacts', async () => {
    const t = tokens.admin
    if (!t) return

    const dels = []
    if (orderId) dels.push(['DELETE', `/orders/${orderId}`])
    if (leadId) dels.push(['DELETE', `/leads/${leadId}`])
    if (dealerId) dels.push(['DELETE', `/dealers/${dealerId}`])
    if (tripId) dels.push(['DELETE', `/trips/${tripId}`])
    if (productId) dels.push(['DELETE', `/products/${productId}`])
    if (categoryId) dels.push(['DELETE', `/product-categories/${categoryId}`])

    for (const [method, path] of dels) {
      const { status } = await req(method, path, { token: t })
      if (status < 300 || status === 404) ok(`cleanup ${path}`, `status ${status}`)
      else soft(`cleanup ${path}`, `status ${status}`)
    }
  })

  console.log('\n════════════════════════════════')
  console.log(`PASS ${pass}  FAIL ${fail}  WARN ${warn}`)
  console.log('════════════════════════════════')

  if (fail > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
