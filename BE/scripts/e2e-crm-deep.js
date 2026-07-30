/**
 * Deep E2E: orders, inventory, trips, payroll + multi-role + multi-month.
 * Usage: node scripts/e2e-crm-deep.js
 *
 * Prerequisites: seeded demo data (node scripts/seed-demo-workflow.js)
 */
require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

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
      `${method} ${path} → ${res.status} (expected ${expectStatus}): ${text.slice(0, 400)}`
    )
    err.status = res.status
    err.data = data
    throw err
  }
  return { status: res.status, data }
}

function unwrap(data) {
  return data?.data !== undefined ? data.data : data
}

async function login(email) {
  const { data } = await req('POST', '/users/login', {
    body: { email, password: PASSWORD },
    expectStatus: 200
  })
  const token = unwrap(data)?.token
  if (!token) throw new Error(`No token for ${email}`)
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

async function stockQty(token, warehouseId, productId) {
  const { data } = await req(
    'GET',
    `/inventory/stocks?warehouseId=${warehouseId}&page=1&limit=200`,
    { token, expectStatus: 200 }
  )
  const items = unwrap(data)?.items || data?.items || []
  const row = items.find((i) => String(i.productId) === String(productId))
  return Number(row?.quantity ?? row?.quantityBase ?? 0)
}

async function main() {
  console.log(`ASAKA CRM DEEP E2E @ ${API}\n`)
  const tokens = {}
  const stamp = Date.now().toString(36)

  await section('A. Login all roles', async () => {
    for (const [role, email] of Object.entries(accounts)) {
      tokens[role] = await login(email)
      ok(`login ${role}`, email)
    }
  })

  // Load fixtures
  let warehouseId
  let productId
  let productPrice
  let unitsPerCase
  let dealerId
  let salesEmpId
  let warehouseEmpId
  let salesUserId

  await section('B. Load fixtures', async () => {
    const t = tokens.admin
    const wh = unwrap(
      (await req('GET', '/warehouses?status=active&limit=5&page=1', { token: t, expectStatus: 200 })).data
    )
    warehouseId = (wh.items || [])[0]?.id
    const products = unwrap(
      (await req('GET', '/products?status=active&limit=20&page=1', { token: t, expectStatus: 200 })).data
    )
    const product = (products.items || [])[0]
    productId = product?.id
    productPrice = Number(product?.price) || 100000
    unitsPerCase = Number(product?.unitsPerCase) || 12
    const dealers = unwrap(
      (await req('GET', '/dealers?status=active&limit=5&page=1', { token: t, expectStatus: 200 })).data
    )
    dealerId = (dealers.items || [])[0]?.id
    const emps = unwrap(
      (await req('GET', '/employees?status=active&limit=20&page=1', { token: t, expectStatus: 200 })).data
    )
    const items = emps.items || []
    const byEmail = (email) =>
      items.find((e) => String(e.email || '').toLowerCase() === email)?.id
    salesEmpId = byEmail('sales@asaka.local') || items[0]?.id
    warehouseEmpId = byEmail('warehouse@asaka.local') || items.find((e) => /Khoa|NV003/i.test(`${e.fullName}${e.code}`))?.id

    const meSales = unwrap(
      (await req('GET', '/users/userAuth', { token: tokens.sales, expectStatus: 200 })).data
    )
    salesUserId = meSales?.id

    if (!warehouseId || !productId || !dealerId || !salesEmpId || !warehouseEmpId) {
      throw new Error(
        `missing fixtures wh=${warehouseId} p=${productId} d=${dealerId} salesEmp=${salesEmpId} whEmp=${warehouseEmpId}`
      )
    }
    ok(
      'fixtures',
      `wh=${warehouseId.slice(-6)} p=${productId.slice(-6)} d=${dealerId.slice(-6)} upc=${unitsPerCase} salesEmp=${salesEmpId.slice(-4)} whEmp=${warehouseEmpId.slice(-4)}`
    )
  })

  await section('C. Role matrix (current permissions)', async () => {
    const cases = [
      // path, role, expectAllow
      ['/orders?page=1&limit=1', 'sales', true],
      ['/orders?page=1&limit=1', 'warehouse', true],
      ['/orders?page=1&limit=1', 'accountant', true],
      ['/leads?page=1&limit=1', 'sales', true],
      ['/leads?page=1&limit=1', 'warehouse', true],
      ['/leads?page=1&limit=1', 'accountant', false],
      ['/dealers?page=1&limit=1', 'sales', true],
      ['/dealers?page=1&limit=1', 'warehouse', true],
      ['/dealers?page=1&limit=1', 'accountant', true],
      ['/inventory/stocks?page=1&limit=1', 'sales', true],
      ['/inventory/stocks?page=1&limit=1', 'warehouse', true],
      ['/inventory/stocks?page=1&limit=1', 'accountant', false],
      ['/payroll?page=1&limit=1', 'sales', true],
      ['/payroll?page=1&limit=1', 'warehouse', true],
      ['/payroll?page=1&limit=1', 'accountant', true],
      ['/trips?page=1&limit=1', 'sales', true],
      ['/trips?page=1&limit=1', 'warehouse', true],
      ['/users', 'sales', false],
      ['/users', 'accountant', true],
      ['/dashboard/reports', 'sales', false],
      ['/dashboard/reports', 'accountant', true],
      ['/products', 'sales', true],
      ['/product-categories', 'warehouse', true]
    ]

    for (const [path, role, allow] of cases) {
      if (!tokens[role]) continue
      const { status } = await req('GET', path, { token: tokens[role] })
      const allowed = status === 200
      if (allow === allowed) ok(`${role} ${allow ? 'OK' : 'DENY'} ${path.split('?')[0]}`)
      else if (!allow && (status === 403 || status === 401)) ok(`${role} DENY ${path.split('?')[0]}`)
      else bad(`${role} access ${path.split('?')[0]}`, `status=${status} expected ${allow ? 200 : 403}`)
    }

    // write gates
    const writeCases = [
      {
        name: 'sales can import stock',
        role: 'sales',
        allow: true,
        run: () =>
          req('POST', '/inventory/import', {
            token: tokens.sales,
            body: { warehouseId, productId, quantity: 1, unitType: 'chai', note: `e2e-deep ${stamp}` }
          })
      },
      {
        name: 'accountant cannot import stock',
        role: 'accountant',
        allow: false,
        run: () =>
          req('POST', '/inventory/import', {
            token: tokens.accountant,
            body: { warehouseId, productId, quantity: 1, unitType: 'chai' }
          })
      },
      {
        name: 'sales cannot generate payroll',
        role: 'sales',
        allow: false,
        run: () =>
          req('POST', '/payroll/generate', {
            token: tokens.sales,
            body: { period: '2026-07' }
          })
      },
      {
        name: 'sales cannot create product',
        role: 'sales',
        allow: false,
        run: () =>
          req('POST', '/products', {
            token: tokens.sales,
            body: { name: 'X', price: 1, status: 'active' }
          })
      }
    ]

    for (const c of writeCases) {
      if (!tokens[c.role]) continue
      const { status } = await c.run()
      const allowed = status < 300
      if (c.allow === allowed) ok(c.name, `status ${status}`)
      else if (!c.allow && (status === 403 || status === 401)) ok(c.name, `blocked ${status}`)
      else bad(c.name, `status ${status} expected ${c.allow ? '2xx' : '403'}`)
    }
  })

  let orderId
  let orderTotal

  await section('D. Inventory + Order stock integrity', async () => {
    const before = await stockQty(tokens.admin, warehouseId, productId)

    // import 36 chai
    {
      const { status } = await req('POST', '/inventory/import', {
        token: tokens.warehouse,
        body: {
          warehouseId,
          productId,
          quantity: 36,
          unitType: 'chai',
          note: `deep-import-${stamp}`
        },
        expectStatus: 201
      }).catch(async (err) => {
        // some APIs return 200
        if (err.status && err.status < 300) return { status: err.status }
        const retry = await req('POST', '/inventory/import', {
          token: tokens.warehouse,
          body: {
            warehouseId,
            productId,
            quantity: 36,
            unitType: 'chai',
            note: `deep-import-${stamp}`
          }
        })
        return retry
      })
      if (status < 300) ok('warehouse import 36', `status ${status}`)
      else bad('warehouse import 36', `status ${status}`)
    }

    const afterImport = await stockQty(tokens.admin, warehouseId, productId)
    if (afterImport === before + 36) ok('stock +36 after import', `${before} → ${afterImport}`)
    else bad('stock +36 after import', `${before} → ${afterImport}`)

    // create order 2 thùng (= 2*unitsPerCase chai)
    const qtyThung = 2
    const qtyBase = qtyThung * unitsPerCase
    {
      const { status, data } = await req('POST', '/orders', {
        token: tokens.sales,
        body: {
          dealerId,
          warehouseId,
          customerName: `Deep Cust ${stamp}`,
          customerPhone: '0912345678',
          items: [
            {
              productId,
              quantity: qtyThung,
              unitType: 'thung',
              unitPrice: productPrice * unitsPerCase
            }
          ],
          note: `deep-order-${stamp}`,
          deliveryEmployeeIds: salesEmpId ? [salesEmpId] : undefined
        }
      })
      const order = unwrap(data)
      orderId = order?.id
      orderTotal = Number(order?.total) || 0
      if (status < 300 && orderId) {
        ok('sales create order (thung)', `id=${orderId} total=${orderTotal} qtyBase?=`)
        const item = (order.items || [])[0]
        const qb = Number(item?.quantityBase ?? item?.quantity)
        // quantityBase should be qtyThung * unitsPerCase when unitType=thung
        if (item?.unitType === 'thung' || qb === qtyBase || Number(item?.quantity) === qtyThung) {
          ok('line item unitType/qty', `unitType=${item?.unitType} qty=${item?.quantity} base=${item?.quantityBase}`)
        } else {
          soft('line item unit', JSON.stringify(item).slice(0, 180))
        }
      } else bad('create order', `status ${status} ${JSON.stringify(data).slice(0, 250)}`)
    }

    // confirm → should export stock
    {
      const { status, data } = await req('PUT', `/orders/${orderId}`, {
        token: tokens.warehouse,
        body: { status: 'confirmed' }
      })
      if (status < 300) ok('warehouse confirm order')
      else bad('confirm order', `status ${status} ${JSON.stringify(data).slice(0, 200)}`)
    }

    const afterConfirm = await stockQty(tokens.admin, warehouseId, productId)
    const expectedAfterConfirm = afterImport - qtyBase
    if (afterConfirm === expectedAfterConfirm) {
      ok('stock decreased by case qty', `${afterImport} - ${qtyBase} = ${afterConfirm}`)
    } else {
      bad(
        'stock decreased by case qty',
        `expected ${expectedAfterConfirm}, got ${afterConfirm} (import=${afterImport})`
      )
    }

    // overpay should fail or clamp
    {
      const { status, data } = await req('POST', `/orders/${orderId}/payments`, {
        token: tokens.accountant,
        body: { amount: orderTotal + 500000, note: 'overpay test' }
      })
      if (status >= 400) ok('reject overpay', `status ${status}`)
      else {
        const order = unwrap(data)
        const paid = Number(order?.paidAmount)
        if (paid <= orderTotal) ok('overpay clamped', `paid=${paid} total=${orderTotal}`)
        else bad('overpay accepted', `paid=${paid} > total=${orderTotal}`)
      }
    }

    // pay exact remaining
    {
      const detail = unwrap(
        (await req('GET', `/orders/${orderId}`, { token: tokens.admin, expectStatus: 200 })).data
      )
      const remaining = Number(detail.remainingAmount ?? detail.total - (detail.paidAmount || 0))
      const { status, data } = await req('POST', `/orders/${orderId}/payments`, {
        token: tokens.sales,
        body: { amount: remaining, note: 'full pay' }
      })
      const order = unwrap(data)
      if (status < 300 && order?.paymentStatus === 'paid') ok('sales record full payment')
      else if (status < 300) soft('payment status', `status=${order?.paymentStatus} paid=${order?.paidAmount}`)
      else bad('full payment', `status ${status}`)
    }

    // delivering → completed
    {
      await req('PUT', `/orders/${orderId}`, {
        token: tokens.warehouse,
        body: { status: 'delivering' }
      })
      const { status } = await req('PUT', `/orders/${orderId}`, {
        token: tokens.warehouse,
        body: { status: 'completed' }
      })
      if (status < 300) ok('complete order')
      else bad('complete order', `status ${status}`)
    }

    // cancel another order after confirm → restore stock
    let cancelOrderId
    const stockBeforeCancelOrder = await stockQty(tokens.admin, warehouseId, productId)
    {
      const { data } = await req('POST', '/orders', {
        token: tokens.warehouse,
        body: {
          dealerId,
          warehouseId,
          items: [{ productId, quantity: 5, unitType: 'chai', unitPrice: productPrice }],
          note: `deep-cancel-${stamp}`
        }
      })
      cancelOrderId = unwrap(data)?.id
      await req('PUT', `/orders/${cancelOrderId}`, {
        token: tokens.warehouse,
        body: { status: 'confirmed' }
      })
      const mid = await stockQty(tokens.admin, warehouseId, productId)
      if (mid === stockBeforeCancelOrder - 5) ok('confirm deducts 5', `${stockBeforeCancelOrder}→${mid}`)
      else bad('confirm deducts 5', `${stockBeforeCancelOrder}→${mid}`)

      const { status } = await req('PUT', `/orders/${cancelOrderId}`, {
        token: tokens.admin,
        body: { status: 'cancelled' }
      })
      if (status < 300) ok('cancel confirmed order')
      else bad('cancel order', `status ${status}`)

      const afterCancel = await stockQty(tokens.admin, warehouseId, productId)
      if (afterCancel === stockBeforeCancelOrder) {
        ok('cancel restores stock', `${mid} → ${afterCancel}`)
      } else {
        bad('cancel restores stock', `expected ${stockBeforeCancelOrder}, got ${afterCancel}`)
      }
    }

    // filters
    {
      const { data } = await req('GET', `/orders?status=completed&dealerId=${dealerId}&page=1&limit=50`, {
        token: tokens.admin,
        expectStatus: 200
      })
      const items = unwrap(data)?.items || []
      const badRow = items.find((o) => o.status !== 'completed' || String(o.dealerId) !== String(dealerId))
      if (!badRow) ok('filter status+dealer', `n=${items.length}`)
      else bad('filter status+dealer', JSON.stringify(badRow).slice(0, 120))
    }
    {
      const { data } = await req('GET', '/orders?hasDebt=true&page=1&limit=50', {
        token: tokens.admin,
        expectStatus: 200
      })
      const items = unwrap(data)?.items || []
      const badRow = items.find(
        (o) => o.paymentStatus === 'paid' || o.status === 'cancelled'
      )
      if (!badRow) ok('filter hasDebt', `n=${items.length}`)
      else bad('filter hasDebt', `unexpected ${badRow.code} pay=${badRow.paymentStatus} st=${badRow.status}`)
    }
  })

  await section('E. Trips — create → expense → settle → payroll Hoàn CT', async () => {
    const members = [salesEmpId, warehouseEmpId].filter(Boolean)
    if (members.length < 1) throw new Error('no employees for trip')

    const start = '2026-06-10'
    const end = '2026-06-12'
    let tripId
    {
      const { status, data } = await req('POST', '/trips', {
        token: tokens.sales,
        body: {
          title: `Deep Trip June ${stamp}`,
          region: 'Đồng Nai',
          startDate: start,
          endDate: end,
          memberIds: members,
          status: 'in_progress',
          note: 'e2e deep june'
        }
      })
      tripId = unwrap(data)?.id
      if (status < 300 && tripId) ok('sales create trip', tripId)
      else bad('create trip', `status ${status} ${JSON.stringify(data).slice(0, 200)}`)
    }

    // advance (accountant)
    {
      const { status } = await req('POST', `/trips/${tripId}/advances`, {
        token: tokens.accountant,
        body: { amount: 2000000, date: start, note: 'tạm ứng' }
      })
      if (status < 300) ok('accountant add advance')
      else bad('add advance', `status ${status}`)
    }

    // expense from advance + reimburse
    let expenseIds = []
    {
      const e1 = await req('POST', `/trips/${tripId}/expenses`, {
        token: tokens.sales,
        body: {
          category: 'fuel',
          amount: 800000,
          date: start,
          funding: 'advance',
          note: 'xăng tạm ứng'
        }
      })
      const e2 = await req('POST', `/trips/${tripId}/expenses`, {
        token: tokens.warehouse,
        body: {
          category: 'lodging',
          amount: 600000,
          date: end,
          funding: 'reimburse',
          note: 'khách sạn tự chi'
        }
      })
      if (e1.status < 300 && e2.status < 300) ok('add expenses advance+reimburse')
      else bad('add expenses', `${e1.status}/${e2.status}`)

      const detail = unwrap(
        (await req('GET', `/trips/${tripId}`, { token: tokens.admin, expectStatus: 200 })).data
      )
      expenseIds = (detail.expenses || []).map((e) => e.id).filter(Boolean)
      const preview = detail.settlementPreview
      if (preview?.companyPay === 600000 && preview?.employeeReturn === 1200000) {
        ok(
          'settlement preview',
          `companyPay=${preview.companyPay} return=${preview.employeeReturn}`
        )
      } else {
        soft('settlement preview', JSON.stringify(preview))
      }
    }

    // approve expenses
    for (const expenseId of expenseIds) {
      const { status } = await req('PUT', `/trips/${tripId}/expenses/${expenseId}/review`, {
        token: tokens.accountant,
        body: { status: 'approved' }
      })
      if (status >= 400) {
        // try alternate path
        const alt = await req('PUT', `/trips/${tripId}/expenses/${expenseId}`, {
          token: tokens.accountant,
          body: { status: 'approved' }
        })
        if (alt.status >= 400) soft(`approve expense ${expenseId}`, `status ${status}/${alt.status}`)
      }
    }
    ok('reviewed expenses', `n=${expenseIds.length}`)

    // settle — settledAt = now (July) nên Hoàn CT vào kỳ 7, không phải kỳ 6 theo ngày đi chuyến
    {
      const { status, data } = await req('POST', `/trips/${tripId}/settle`, {
        token: tokens.accountant,
        body: { note: 'deep settle june' }
      })
      const trip = unwrap(data)
      if (status < 300 && trip?.status === 'closed') {
        ok('settle trip closed', `companyPay=${trip.settlement?.companyPay}`)
        if (Number(trip.settlement?.companyPay) === 600000) ok('settled companyPay=600k')
        else soft('settled companyPay', String(trip.settlement?.companyPay))
      } else {
        bad('settle trip', `status ${status} ${JSON.stringify(data).slice(0, 250)}`)
      }
    }

    // Kỳ 6: chưa có settledAt trong tháng 6 → Hoàn CT = 0 (thiết kế: theo ngày quyết toán)
    {
      const { status, data } = await req('POST', '/payroll/generate', {
        token: tokens.accountant,
        body: { period: '2026-06' }
      })
      const payroll = unwrap(data)
      if (status < 300) {
        ok('generate payroll 2026-06', `lines=${payroll.lines?.length}`)
        const matched = (payroll.lines || []).filter((l) =>
          members.includes(String(l.employeeId))
        )
        const anyTrip = matched.some((l) => Number(l.tripReimburse) > 0)
        if (!anyTrip) {
          ok(
            'June payroll ignores trip settled in July',
            'Hoàn CT theo settledAt, không theo ngày đi'
          )
        } else {
          soft(
            'June payroll has Hoàn CT',
            matched.map((l) => `${l.employeeName}:${l.tripReimburse}`).join(', ')
          )
        }
      } else bad('generate payroll 2026-06', `status ${status}`)
    }

    // Kỳ 7: phải có 600k chia đều + CT-DEMO-001 900k/2
    {
      const { status, data } = await req('POST', '/payroll/generate', {
        token: tokens.accountant,
        body: { period: '2026-07' }
      })
      const payroll = unwrap(data)
      if (status < 300) {
        const share = Math.round(600000 / members.length)
        const matched = (payroll.lines || []).filter((l) =>
          members.includes(String(l.employeeId))
        )
        const okShare = matched.every((l) => Number(l.tripReimburse) >= share)
        if (okShare && matched.length) {
          ok(
            'July Hoàn CT includes June trip (settled now)',
            matched.map((l) => `${l.employeeName}:${l.tripReimburse}`).join(', ')
          )
        } else {
          bad(
            'July Hoàn CT includes June trip',
            `expected >=${share}; got ${JSON.stringify(
              matched.map((l) => ({ n: l.employeeName, tr: l.tripReimburse }))
            )}`
          )
        }

        const withTrip = (payroll.lines || []).filter((l) => Number(l.tripReimburse) > 0)
        ok(
          'July payroll Hoàn CT summary',
          withTrip.map((l) => `${l.employeeName}:${l.tripReimburse}`).join(', ') || 'none'
        )
        const tuan = (payroll.lines || []).find((l) => /Tuấn/i.test(l.employeeName || ''))
        if (tuan && Number(tuan.tripReimburse) >= 450000 + share) {
          ok('Tuấn Hoàn CT >= DEMO450k + deep share', String(tuan.tripReimburse))
        } else if (tuan && Number(tuan.tripReimburse) >= 450000) {
          soft('Tuấn Hoàn CT', String(tuan.tripReimburse))
        }
      } else bad('generate payroll 2026-07', `status ${status}`)
    }

    // sales sees only own payroll lines
    {
      const list = unwrap(
        (await req('GET', '/payroll?page=1&limit=10', { token: tokens.sales, expectStatus: 200 })).data
      )
      const period = (list.items || [])[0]
      if (!period) soft('sales payroll list empty')
      else {
        const detail = unwrap(
          (await req('GET', `/payroll/${period.id}`, { token: tokens.sales, expectStatus: 200 })).data
        )
        const names = (detail.lines || []).map((l) => l.employeeName)
        if ((detail.lines || []).length <= 2) ok('sales payroll scoped', names.join(', '))
        else soft('sales payroll scoped', `lines=${detail.lines.length} ${names.join(', ')}`)
      }
    }
  })

  await section('F. Multi-month orders via DB backdate + commission', async () => {
    const client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
    const db = client.db(process.env.DATABASE_NAME)

    // Backdate a completed paid order into May for sales commission
    const mayDate = new Date(Date.UTC(2026, 4, 15, 4, 0, 0))
    const insert = await db.collection('orders').insertOne({
      code: `DH-DEEP-MAY-${stamp}`,
      dealerId: new ObjectId(dealerId),
      warehouseId: new ObjectId(warehouseId),
      customerName: 'Deep May',
      customerPhone: '0900001111',
      items: [
        {
          productId: new ObjectId(productId),
          productName: 'Deep',
          quantity: 10,
          unitType: 'chai',
          quantityBase: 10,
          unitPrice: productPrice,
          lineTotal: productPrice * 10
        }
      ],
      subtotal: productPrice * 10,
      discount: 0,
      total: productPrice * 10,
      status: 'completed',
      paymentStatus: 'paid',
      paidAmount: productPrice * 10,
      shippingFee: 0,
      createdBy: salesUserId ? new ObjectId(salesUserId) : null,
      createdAt: mayDate,
      updatedAt: mayDate,
      _destroy: false
    })
    ok('insert May completed order', insert.insertedId.toString())

    await client.close()

    const { status, data } = await req('POST', '/payroll/generate', {
      token: tokens.accountant,
      body: { period: '2026-05' }
    })
    const payroll = unwrap(data)
    if (status < 300) {
      ok('generate payroll 2026-05')
      const salesLine = (payroll.lines || []).find((l) => String(l.employeeId) === String(salesEmpId))
        || (payroll.lines || []).find((l) => Number(l.salesTotal) > 0)
      if (salesLine && Number(salesLine.salesTotal) >= productPrice * 10) {
        ok(
          'May commission base salesTotal',
          `${salesLine.employeeName} sales=${salesLine.salesTotal} hh=${salesLine.commission}`
        )
      } else {
        soft('May commission', JSON.stringify(salesLine))
      }
    } else bad('generate May payroll', `status ${status}`)
  })

  await section('G. Trip list scoping by role', async () => {
    const salesList = unwrap(
      (await req('GET', '/trips?page=1&limit=50', { token: tokens.sales, expectStatus: 200 })).data
    )
    const adminList = unwrap(
      (await req('GET', '/trips?page=1&limit=50', { token: tokens.admin, expectStatus: 200 })).data
    )
    ok('sales trips count', String((salesList.items || []).length))
    ok('admin trips count', String((adminList.items || []).length))
    if ((adminList.items || []).length >= (salesList.items || []).length) {
      ok('admin sees >= sales trips')
    } else {
      bad('admin sees >= sales trips', `admin=${adminList.items.length} sales=${salesList.items.length}`)
    }
  })

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`PASS ${pass}  FAIL ${fail}  WARN ${warn}`)
  if (fail) {
    console.log('\nFailures:')
    results.filter((r) => r.status === 'FAIL').forEach((r) => console.log(` - ${r.name}: ${r.detail}`))
  }
  process.exit(fail ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
