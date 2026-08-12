/**
 * Seed dữ liệu ảo 3 tháng — đủ mọi flow CRM để xem UI.
 *
 * GIỮ: products, product_categories, warehouses, news, admin
 * XÓA ops rồi tạo lại: user demo, NV, NCC, lead, đại lý, tồn/NXK,
 *   phiếu nhập, đơn, audit, chuyến, lương, thông báo
 *
 * Tài khoản demo (mật khẩu 123123):
 *   admin@asaka.local
 *   sales@asaka.local / warehouse@asaka.local / accountant@asaka.local
 *
 * Usage (from BE/): npm run seed-demo
 */
require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')
const bcrypt = require('bcryptjs')

const MONTHS = 3
const ADMIN_EMAIL = 'admin@asaka.local'
const DEMO_PASSWORD = '123123'

const DEMO_STAFF_EMAILS = [
  'sales@asaka.local',
  'sales2@asaka.local',
  'warehouse@asaka.local',
  'accountant@asaka.local'
]

const CLEAR = [
  'warehouse_stocks',
  'inventory_transactions',
  'purchase_invoices',
  'orders',
  'order_audits',
  'quotes',
  'dealers',
  'leads',
  'trips',
  'payroll_periods',
  'employees',
  'suppliers',
  'notifications',
  'user_notification_states',
  'push_subscriptions',
  'token_blacklist'
]

function at(year, monthIndex, day, hour = 10, minute = 0) {
  const d = new Date(year, monthIndex, day, hour, minute, 0, 0)
  return d
}

function monthParts(offset) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + offset)
  return { year: d.getFullYear(), month: d.getMonth() }
}

function monthKey(offset) {
  const { year, month } = monthParts(offset)
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function clampDay(year, month, day) {
  const last = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  let d = Math.min(day, last)
  if (year === today.getFullYear() && month === today.getMonth()) {
    d = Math.min(d, Math.max(1, today.getDate() - (day > today.getDate() ? 0 : 0)))
    d = Math.min(d, today.getDate())
  }
  return Math.max(1, d)
}

function oid() {
  return new ObjectId()
}

function money(n) {
  return Math.round(Number(n) || 0)
}

function unitsPerCaseOf(product) {
  const n = Number(product.unitsPerCase)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
}

function costPerBottle(product) {
  const c = Number(product.costPrice)
  if (Number.isFinite(c) && c > 0) return c
  const p = Number(product.price) || 50000
  return Math.round(p * 0.55)
}

async function main() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.DATABASE_NAME
  if (!uri || !dbName) throw new Error('Missing MONGODB_URI or DATABASE_NAME in .env')

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  console.log(`DB: ${dbName}`)
  console.log(`Seed window: ${MONTHS} months (${monthKey(1 - MONTHS)} → ${monthKey(0)})`)
  console.log('---')

  for (const name of CLEAR) {
    const exists = await db.listCollections({ name }).hasNext()
    if (!exists) continue
    const result = await db.collection(name).deleteMany({})
    console.log(`Cleared ${name}: ${result.deletedCount}`)
  }

  await db.collection('users').deleteMany({ email: { $in: DEMO_STAFF_EMAILS } })

  let admin = await db.collection('users').findOne({
    $or: [{ role: 'admin' }, { roles: 'admin' }],
    _destroy: { $ne: true }
  })
  if (!admin) {
    const inserted = await db.collection('users').insertOne({
      email: ADMIN_EMAIL,
      username: 'admin',
      password: passwordHash,
      avatar: null,
      role: 'admin',
      roles: ['admin'],
      createdAt: at(...Object.values(monthParts(1 - MONTHS)), 1, 8),
      updatedAt: null,
      _destroy: false
    })
    admin = await db.collection('users').findOne({ _id: inserted.insertedId })
    console.log(`Created admin ${ADMIN_EMAIL} / ${DEMO_PASSWORD}`)
  } else {
    await db.collection('users').updateOne(
      { _id: admin._id },
      { $set: { password: passwordHash, role: 'admin', roles: ['admin'], _destroy: false } }
    )
    admin = await db.collection('users').findOne({ _id: admin._id })
    console.log(`Reset admin password → ${DEMO_PASSWORD}`)
  }

  const products = await db
    .collection('products')
    .find({ _destroy: { $ne: true }, status: 'active' })
    .sort({ displayOrder: 1, createdAt: 1 })
    .toArray()
  const warehouses = await db
    .collection('warehouses')
    .find({ _destroy: { $ne: true }, status: 'active' })
    .toArray()

  if (!products.length) throw new Error('Không có sản phẩm active — seed catalog trước')
  if (!warehouses.length) throw new Error('Không có kho active — seed kho trước')

  const warehouse = warehouses[0]
  const catalog = products.slice(0, Math.min(10, products.length))

  const staffDefs = [
    {
      email: 'sales@asaka.local',
      username: 'sales01',
      role: 'sales',
      employee: {
        code: 'NV001',
        fullName: 'Nguyễn Minh Tuấn',
        phone: '0901111001',
        title: 'Sales Executive',
        department: 'Kinh doanh',
        baseSalary: 12000000,
        commissionPercent: 2.5,
        allowance: 1000000,
        bankName: 'Vietcombank',
        bankAccount: '0121001001'
      }
    },
    {
      email: 'sales2@asaka.local',
      username: 'sales02',
      role: 'sales',
      employee: {
        code: 'NV002',
        fullName: 'Trần Thị Hạnh',
        phone: '0901111002',
        title: 'Sales Executive',
        department: 'Kinh doanh',
        baseSalary: 11000000,
        commissionPercent: 2,
        allowance: 800000,
        bankName: 'MB Bank',
        bankAccount: '0121001002'
      }
    },
    {
      email: 'warehouse@asaka.local',
      username: 'kho01',
      role: 'warehouse',
      employee: {
        code: 'NV003',
        fullName: 'Lê Văn Khoa',
        phone: '0901111003',
        title: 'Thủ kho',
        department: 'Kho vận',
        baseSalary: 9000000,
        commissionPercent: 0,
        allowance: 500000,
        bankName: 'Techcombank',
        bankAccount: '0121001003'
      }
    },
    {
      email: 'accountant@asaka.local',
      username: 'ketoan01',
      role: 'accountant',
      employee: {
        code: 'NV004',
        fullName: 'Phạm Thu Hà',
        phone: '0901111004',
        title: 'Kế toán',
        department: 'Tài chính',
        baseSalary: 13000000,
        commissionPercent: 0,
        allowance: 700000,
        bankName: 'VietinBank',
        bankAccount: '0121001004'
      }
    }
  ]

  const users = { admin }
  const employees = []

  for (const def of staffDefs) {
    const createdAt = at(...Object.values(monthParts(1 - MONTHS)), 3, 9)
    const userRes = await db.collection('users').insertOne({
      email: def.email,
      username: def.username,
      password: passwordHash,
      avatar: null,
      role: def.role,
      roles: [def.role],
      createdAt,
      updatedAt: null,
      _destroy: false
    })
    users[def.username] = { _id: userRes.insertedId, ...def }
    const empRes = await db.collection('employees').insertOne({
      ...def.employee,
      email: def.email,
      userId: userRes.insertedId,
      bankQrImage: '',
      status: 'active',
      note: 'Nhân viên demo',
      createdBy: admin._id,
      createdAt,
      updatedAt: null,
      _destroy: false
    })
    employees.push({
      _id: empRes.insertedId,
      userId: userRes.insertedId,
      ...def.employee,
      email: def.email
    })
  }

  const empResExtra = await db.collection('employees').insertOne({
    code: 'NV005',
    fullName: 'Đặng Quốc Việt',
    phone: '0901111005',
    email: 'viet.driver@asaka.local',
    title: 'Tài xế',
    department: 'Kho vận',
    userId: null,
    baseSalary: 8000000,
    commissionPercent: 0,
    allowance: 400000,
    bankName: 'ACB',
    bankAccount: '0121001005',
    bankQrImage: '',
    status: 'active',
    note: 'NV chưa gắn tài khoản CRM — dùng để test tạo user',
    createdBy: admin._id,
    createdAt: at(...Object.values(monthParts(-1)), 5, 10),
    updatedAt: null,
    _destroy: false
  })
  employees.push({
    _id: empResExtra.insertedId,
    userId: null,
    code: 'NV005',
    fullName: 'Đặng Quốc Việt',
    baseSalary: 8000000,
    commissionPercent: 0,
    allowance: 400000
  })

  const sales = users.sales01
  const sales2 = users.sales02
  const warehouseUser = users.kho01
  const accountant = users.ketoan01
  const empSales = employees[0]
  const empSales2 = employees[1]
  const empKho = employees[2]

  console.log(`Staff: ${staffDefs.length} users + ${employees.length} employees`)

  const supplierDefs = [
    {
      name: 'NCC Hóa chất An Phát',
      contactName: 'Lý Đức',
      phone: '0905555001',
      email: 'anphat@supplier.vn',
      address: 'KCN Tân Bình, TP.HCM',
      taxCode: '0312345678'
    },
    {
      name: 'NCC Bao bì Minh Long',
      contactName: 'Ngô Mai',
      phone: '0905555002',
      email: 'minhlong@supplier.vn',
      address: 'Biên Hòa, Đồng Nai',
      taxCode: '3609876543'
    },
    {
      name: 'NCC Nguyên liệu Đà Nẵng',
      contactName: 'Trịnh Hải',
      phone: '0905555003',
      email: 'danang.nl@supplier.vn',
      address: 'Liên Chiểu, Đà Nẵng',
      taxCode: '0401122334'
    }
  ]

  const suppliers = []
  for (const [index, def] of supplierDefs.entries()) {
    const res = await db.collection('suppliers').insertOne({
      ...def,
      status: 'active',
      note: 'NCC demo',
      createdBy: warehouseUser._id,
      createdAt: at(...Object.values(monthParts(1 - MONTHS)), 4 + index, 9),
      updatedAt: null,
      _destroy: false
    })
    suppliers.push({ _id: res.insertedId, ...def })
  }

  const leadDefs = [
    {
      name: 'Công ty TNHH Nông Sản Miền Tây',
      phone: '0902222001',
      email: 'lienhe@nongsansmt.vn',
      company: 'Nông Sản Miền Tây',
      region: 'Cần Thơ',
      message: 'Muốn làm đại lý phân phối ĐBSCL',
      type: 'dealer',
      source: 'website',
      status: 'converted',
      offset: 1 - MONTHS,
      day: 6
    },
    {
      name: 'Anh Hoàng - Vựa Long An',
      phone: '0902222002',
      email: 'hoang.longan@gmail.com',
      company: 'Vựa Long An',
      region: 'Long An',
      message: 'Cần báo giá lô lớn',
      type: 'dealer',
      source: 'facebook',
      status: 'converted',
      offset: -1,
      day: 4
    },
    {
      name: 'Chị Lan - HTX Rau Sạch Đà Lạt',
      phone: '0902222003',
      email: 'lan.dalat@gmail.com',
      company: 'HTX Rau Sạch Đà Lạt',
      region: 'Lâm Đồng',
      message: 'Xin catalog sản phẩm mới',
      type: 'dealer',
      source: 'website',
      status: 'qualified',
      offset: 0,
      day: 3
    },
    {
      name: 'Anh Bình',
      phone: '0902222004',
      email: '',
      company: '',
      region: 'TP.HCM',
      message: 'Hỏi mua lẻ trang trại nhỏ',
      type: 'contact',
      source: 'zalo',
      status: 'contacted',
      offset: 0,
      day: 8
    },
    {
      name: 'Shop Nông Nghiệp Bình Dương',
      phone: '0902222005',
      email: 'shopbd@gmail.com',
      company: 'Shop NN Bình Dương',
      region: 'Bình Dương',
      message: 'Muốn làm đại lý cấp 2',
      type: 'dealer',
      source: 'website',
      status: 'new',
      offset: 0,
      day: 11
    },
    {
      name: 'HTX Cà phê Buôn Ma Thuột',
      phone: '0902222006',
      email: 'htx.bmt@gmail.com',
      company: 'HTX Cà phê BMT',
      region: 'Đắk Lắk',
      message: 'Không còn nhu cầu',
      type: 'dealer',
      source: 'website',
      status: 'closed',
      offset: -1,
      day: 18
    }
  ]

  const leads = []
  for (const def of leadDefs) {
    const { year, month } = monthParts(def.offset)
    const createdAt = at(year, month, clampDay(year, month, def.day), 9)
    const res = await db.collection('leads').insertOne({
      name: def.name,
      phone: def.phone,
      email: def.email,
      company: def.company,
      region: def.region,
      message: def.message,
      type: def.type,
      source: def.source,
      status: def.status,
      note: def.status === 'converted' ? 'Đã chuyển thành đại lý' : '',
      dealerId: null,
      createdAt,
      updatedAt: null,
      _destroy: false
    })
    leads.push({ _id: res.insertedId, ...def })
  }

  const dealerDefs = [
    {
      name: 'Đại lý Nông Sản Miền Tây',
      contactName: 'Nguyễn Văn Đông',
      phone: '0902222001',
      email: 'lienhe@nongsansmt.vn',
      address: '12 Nguyễn Văn Cừ, Ninh Kiều, Cần Thơ',
      region: 'Cần Thơ',
      lat: 10.0452,
      lng: 105.7469,
      tier: 'gold',
      discountPercent: 8,
      status: 'active',
      lead: leads[0],
      createdBy: sales._id,
      offset: 1 - MONTHS,
      day: 8
    },
    {
      name: 'Đại lý Long An Agro',
      contactName: 'Hoàng Minh',
      phone: '0902222002',
      email: 'hoang.longan@gmail.com',
      address: '45 Quốc lộ 1A, Bến Lức, Long An',
      region: 'Long An',
      lat: 10.644,
      lng: 106.595,
      tier: 'silver',
      discountPercent: 5,
      status: 'active',
      lead: leads[1],
      createdBy: sales2._id,
      offset: -1,
      day: 6
    },
    {
      name: 'Đại lý Tây Nguyên Green',
      contactName: 'Phạm Quốc Bảo',
      phone: '0903333001',
      email: 'taynguyen.green@gmail.com',
      address: '88 Phan Đình Phùng, Đà Lạt',
      region: 'Lâm Đồng',
      lat: 11.9404,
      lng: 108.4583,
      tier: 'standard',
      discountPercent: 3,
      status: 'active',
      lead: null,
      createdBy: sales._id,
      offset: -1,
      day: 12
    },
    {
      name: 'Đại lý Đồng Nai Farm',
      contactName: 'Bùi Thanh Tâm',
      phone: '0903333003',
      email: 'dongnai.farm@gmail.com',
      address: 'Long Thành, Đồng Nai',
      region: 'Đồng Nai',
      lat: 10.789,
      lng: 106.952,
      tier: 'silver',
      discountPercent: 5,
      status: 'active',
      lead: null,
      createdBy: sales2._id,
      offset: 0,
      day: 2
    },
    {
      name: 'Đại lý Đông Nam Bộ',
      contactName: 'Võ Thanh Sơn',
      phone: '0903333002',
      email: 'dongnambo@gmail.com',
      address: '21 Đại lộ Bình Dương, Thủ Dầu Một',
      region: 'Bình Dương',
      lat: 10.9804,
      lng: 106.6519,
      tier: 'standard',
      discountPercent: 2,
      status: 'pending',
      lead: null,
      createdBy: sales2._id,
      offset: 0,
      day: 9
    }
  ]

  const dealers = []
  for (const def of dealerDefs) {
    const { year, month } = monthParts(def.offset)
    const createdAt = at(year, month, clampDay(year, month, def.day), 11)
    const res = await db.collection('dealers').insertOne({
      name: def.name,
      contactName: def.contactName,
      phone: def.phone,
      email: def.email,
      address: def.address,
      region: def.region,
      lat: def.lat,
      lng: def.lng,
      tier: def.tier,
      discountPercent: def.discountPercent,
      status: def.status,
      note: 'Đại lý demo',
      leadId: def.lead?._id || null,
      createdBy: def.createdBy,
      createdAt,
      updatedAt: null,
      _destroy: false
    })
    const dealer = { _id: res.insertedId, ...def }
    dealers.push(dealer)
    if (def.lead) {
      await db.collection('leads').updateOne(
        { _id: def.lead._id },
        { $set: { dealerId: res.insertedId, status: 'converted', updatedAt: createdAt } }
      )
    }
  }

  const activeDealers = dealers.filter((d) => d.status === 'active')
  console.log(`Leads ${leads.length} · Dealers ${dealers.length} · NCC ${suppliers.length}`)

  const stock = new Map()
  let importCount = 0
  let purchaseCount = 0
  const purchases = []

  async function importStock({ product, qtyBase, when, supplier, paidRatio, note }) {
    const upc = unitsPerCaseOf(product)
    const unitType = upc > 1 && qtyBase % upc === 0 ? 'thung' : 'chai'
    const quantity = unitType === 'thung' ? qtyBase / upc : qtyBase
    const unitCost =
      unitType === 'thung' ? costPerBottle(product) * upc : costPerBottle(product)
    const totalCost = money(unitCost * quantity)
    const key = String(product._id)
    stock.set(key, (stock.get(key) || 0) + qtyBase)
    const txId = oid()
    await db.collection('inventory_transactions').insertOne({
      _id: txId,
      type: 'import',
      warehouseId: warehouse._id,
      productId: product._id,
      quantity,
      unitType,
      quantityBase: qtyBase,
      unitsPerCase: upc,
      note,
      unitCost,
      totalCost,
      supplierId: supplier._id,
      purchaseId: null,
      balanceAfter: stock.get(key),
      createdBy: warehouseUser._id,
      createdAt: when
    })
    importCount += 1

    const paidAmount = money(totalCost * paidRatio)
    const paymentStatus =
      paidAmount >= totalCost ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid'
    const y = when.getFullYear()
    const m = String(when.getMonth() + 1).padStart(2, '0')
    const d = String(when.getDate()).padStart(2, '0')
    const purchaseId = oid()
    const due = new Date(when)
    due.setDate(due.getDate() + 20)
    await db.collection('purchase_invoices').insertOne({
      _id: purchaseId,
      code: `PN-${y}${m}${d}-${String(purchaseCount + 1).padStart(3, '0')}`,
      supplierId: supplier._id,
      warehouseId: warehouse._id,
      invoiceDate: when,
      dueDate: paymentStatus === 'paid' ? null : due,
      items: [
        {
          productId: product._id,
          productName: product.name,
          quantity,
          unitType,
          quantityBase: qtyBase,
          unitCost,
          totalCost,
          transactionId: txId
        }
      ],
      total: totalCost,
      paidAmount,
      paymentStatus,
      status: 'open',
      note,
      createdBy: warehouseUser._id,
      createdAt: when,
      updatedAt: paymentStatus === 'unpaid' ? null : when,
      _destroy: false
    })
    await db.collection('inventory_transactions').updateOne(
      { _id: txId },
      { $set: { purchaseId } }
    )
    purchaseCount += 1
    purchases.push({ _id: purchaseId, total: totalCost, paidAmount })
  }

  async function exportStock({ product, qtyBase, when, note, orderCode }) {
    const key = String(product._id)
    const have = stock.get(key) || 0
    if (have < qtyBase) return false
    const upc = unitsPerCaseOf(product)
    const unitType = upc > 1 && qtyBase % upc === 0 ? 'thung' : 'chai'
    const quantity = unitType === 'thung' ? qtyBase / upc : qtyBase
    const unitCost =
      unitType === 'thung' ? costPerBottle(product) * upc : costPerBottle(product)
    stock.set(key, have - qtyBase)
    await db.collection('inventory_transactions').insertOne({
      type: 'export',
      warehouseId: warehouse._id,
      productId: product._id,
      quantity,
      unitType,
      quantityBase: qtyBase,
      unitsPerCase: upc,
      note: note || (orderCode ? `Xuất theo đơn ${orderCode}` : 'Xuất kho demo'),
      unitCost,
      totalCost: money(unitCost * quantity),
      supplierId: null,
      purchaseId: null,
      balanceAfter: stock.get(key),
      createdBy: warehouseUser._id,
      createdAt: when
    })
    return true
  }

  for (let offset = 1 - MONTHS; offset <= 0; offset += 1) {
    const { year, month } = monthParts(offset)
    const factor = offset === 1 - MONTHS ? 1 : 0.45
    for (let i = 0; i < catalog.length; i += 1) {
      const product = catalog[i]
      const upc = unitsPerCaseOf(product)
      const cases = Math.round((18 + i * 4) * factor)
      const qtyBase = Math.max(upc, cases * upc)
      const supplier = suppliers[i % suppliers.length]
      const paidRatio = offset < 0 ? 1 : i % 3 === 0 ? 0 : i % 3 === 1 ? 0.4 : 1
      await importStock({
        product,
        qtyBase,
        when: at(year, month, clampDay(year, month, 2 + (i % 4)), 8, i * 3),
        supplier,
        paidRatio,
        note: `Nhập kho demo ${monthKey(offset)}`
      })
    }
  }

  const orderSeq = new Map()
  function nextOrderCode(when) {
    const key = when.toISOString().slice(0, 10).replace(/-/g, '')
    const n = (orderSeq.get(key) || 0) + 1
    orderSeq.set(key, n)
    return `O-${key}-${String(n).padStart(3, '0')}`
  }

  const orders = []
  let orderCount = 0

  async function createOrder({
    dealer,
    createdBy,
    emp,
    status,
    paymentStatus,
    paidRatio,
    day,
    offset,
    hour,
    productIndices,
    qtyMul,
    discount
  }) {
    const { year, month } = monthParts(offset)
    const createdAt = at(year, month, clampDay(year, month, day), hour)
    const items = productIndices.map((idx, i) => {
      const product = catalog[idx % catalog.length]
      const upc = unitsPerCaseOf(product)
      const bottles = Math.max(upc, Math.round((6 + i * 4) * qtyMul))
      const unitPrice = Number(product.price) || 80000
      const unitCost = costPerBottle(product)
      return {
        productId: product._id,
        productName: product.name,
        productImage: product.image || '',
        quantity: bottles,
        unitType: 'chai',
        quantityBase: bottles,
        unitPrice,
        lineTotal: money(bottles * unitPrice),
        unitCost,
        lineCost: money(bottles * unitCost),
        product
      }
    })
    const subtotal = items.reduce((s, it) => s + it.lineTotal, 0)
    const disc = money(discount || 0)
    const total = Math.max(0, subtotal - disc)
    const costTotal = items.reduce((s, it) => s + it.lineCost, 0)
    let exported = ['confirmed', 'delivering', 'completed'].includes(status)
    if (exported) {
      const canExport = items.every(
        (item) => (stock.get(String(item.product._id)) || 0) >= item.quantityBase
      )
      if (!canExport) exported = false
    }
    if (!exported && ['confirmed', 'delivering', 'completed'].includes(status)) {
      status = 'pending'
    }
    const cancelled = status === 'cancelled'
    const paidAmount =
      paymentStatus === 'unpaid' ? 0 : money(total * (paidRatio ?? 1))
    const resolvedPayment =
      paidAmount <= 0 ? 'unpaid' : paidAmount >= total ? 'paid' : 'partial'

    const code = nextOrderCode(createdAt)
    if (exported) {
      for (const item of items) {
        await exportStock({
          product: item.product,
          qtyBase: item.quantityBase,
          when: new Date(createdAt.getTime() + 2 * 3600000),
          orderCode: code
        })
      }
    }
    const confirmedAt = exported ? new Date(createdAt.getTime() + 2 * 3600000) : null
    const shippedAt =
      status === 'delivering' || status === 'completed'
        ? new Date(createdAt.getTime() + 26 * 3600000)
        : null
    const deliveredAt =
      status === 'completed' ? new Date(createdAt.getTime() + 50 * 3600000) : null

    const orderId = oid()
    await db.collection('orders').insertOne({
      _id: orderId,
      code,
      dealerId: dealer._id,
      quoteId: null,
      warehouseId: warehouse._id,
      tripId: null,
      customerName: dealer.contactName,
      customerPhone: dealer.phone,
      customerEmail: dealer.email,
      items: items.map(({ product: _p, ...rest }) => rest),
      subtotal,
      discount: disc,
      total,
      costTotal,
      grossProfit: cancelled ? 0 : money(total - costTotal),
      status,
      note: `Đơn demo ${monthKey(offset)}`,
      inventoryExported: status !== 'pending' && status !== 'cancelled' && exported,
      inventoryExportClaimedAt: null,
      paymentStatus: resolvedPayment,
      paidAmount: cancelled ? 0 : paidAmount,
      paymentNote: resolvedPayment === 'paid' ? 'Thu đủ' : '',
      shippingAddress: dealer.address,
      shippingContactName: dealer.contactName,
      shippingPhone: dealer.phone,
      carrier: shippedAt ? 'Xe công ty' : '',
      deliveryEmployeeIds: emp ? [emp._id] : [],
      trackingCode: shippedAt ? `VD-${code.slice(-6)}` : '',
      shippingDate: shippedAt,
      deliveredAt,
      shippingFee: 0,
      shippingNote: '',
      createdBy,
      createdAt,
      updatedAt: deliveredAt || shippedAt || confirmedAt,
      _destroy: false
    })

    const audits = [
      {
        orderId,
        orderCode: code,
        action: 'created',
        actorUserId: createdBy,
        meta: { status: 'pending' },
        createdAt
      }
    ]
    if (exported && status !== 'pending') {
      audits.push({
        orderId,
        orderCode: code,
        action: 'confirmed_exported',
        actorUserId: warehouseUser._id,
        meta: { from: 'pending', to: 'confirmed' },
        createdAt: confirmedAt
      })
    }
    if (status === 'delivering' || status === 'completed') {
      audits.push({
        orderId,
        orderCode: code,
        action: 'status_changed',
        actorUserId: createdBy,
        meta: { from: 'confirmed', to: 'delivering' },
        createdAt: shippedAt
      })
    }
    if (status === 'completed') {
      audits.push({
        orderId,
        orderCode: code,
        action: 'status_changed',
        actorUserId: createdBy,
        meta: { from: 'delivering', to: 'completed' },
        createdAt: deliveredAt
      })
    }
    if (status === 'cancelled') {
      audits.push({
        orderId,
        orderCode: code,
        action: 'cancelled',
        actorUserId: createdBy,
        meta: { from: 'pending', to: 'cancelled' },
        createdAt: new Date(createdAt.getTime() + 3600000)
      })
    }
    if (!cancelled && paidAmount > 0) {
      audits.push({
        orderId,
        orderCode: code,
        action: 'payment_recorded',
        actorUserId: accountant._id,
        meta: { amount: paidAmount, paymentStatus: resolvedPayment },
        createdAt: deliveredAt || confirmedAt || createdAt
      })
    }
    await db.collection('order_audits').insertMany(audits)

    orderCount += 1
    const doc = {
      _id: orderId,
      code,
      status,
      createdAt,
      createdBy,
      dealer,
      total
    }
    orders.push(doc)
    return doc
  }

  const templates = [
    { status: 'completed', paymentStatus: 'paid', paidRatio: 1, qtyMul: 1.1, discount: 150000 },
    { status: 'completed', paymentStatus: 'paid', paidRatio: 1, qtyMul: 0.9, discount: 0 },
    { status: 'completed', paymentStatus: 'partial', paidRatio: 0.45, qtyMul: 1, discount: 0 },
    { status: 'completed', paymentStatus: 'unpaid', paidRatio: 0, qtyMul: 0.8, discount: 0 },
    { status: 'delivering', paymentStatus: 'partial', paidRatio: 0.3, qtyMul: 0.7, discount: 0 },
    { status: 'confirmed', paymentStatus: 'unpaid', paidRatio: 0, qtyMul: 0.6, discount: 0 },
    { status: 'pending', paymentStatus: 'unpaid', paidRatio: 0, qtyMul: 0.5, discount: 0 },
    { status: 'cancelled', paymentStatus: 'unpaid', paidRatio: 0, qtyMul: 0.4, discount: 0 }
  ]

  for (let offset = 1 - MONTHS; offset <= 0; offset += 1) {
    const isCurrent = offset === 0
    const count = isCurrent ? 8 : 6
    for (let i = 0; i < count; i += 1) {
      const tpl = isCurrent ? templates[i % templates.length] : templates[i % 4]
      const dealer = activeDealers[i % activeDealers.length]
      const salesUser = i % 2 === 0 ? sales : sales2
      const emp = i % 2 === 0 ? empSales : empSales2
      await createOrder({
        dealer,
        createdBy: salesUser._id,
        emp,
        status: tpl.status,
        paymentStatus: tpl.paymentStatus,
        paidRatio: tpl.paidRatio,
        day: 5 + i * 3,
        offset,
        hour: 9 + (i % 6),
        productIndices: [i % catalog.length, (i + 1) % catalog.length, (i + 2) % catalog.length].slice(
          0,
          2 + (i % 2)
        ),
        qtyMul: tpl.qtyMul,
        discount: tpl.discount
      })
    }
  }

  console.log(`Orders ${orderCount} · Imports ${importCount} · Purchases ${purchaseCount}`)

  const tripSeq = { n: 0 }
  function nextTripCode(when) {
    tripSeq.n += 1
    const key = `${when.getFullYear()}${String(when.getMonth() + 1).padStart(2, '0')}`
    return `T-${key}-${String(tripSeq.n).padStart(3, '0')}`
  }

  function settlementOf(advances, expenses, settledAt, settledBy) {
    const advanceTotal = advances.reduce((s, a) => s + a.amount, 0)
    const approved = expenses.filter((e) => e.status === 'approved')
    const expenseAdvanceTotal = approved
      .filter((e) => e.funding === 'advance')
      .reduce((s, e) => s + e.amount, 0)
    const expenseReimburseTotal = approved
      .filter((e) => e.funding === 'reimburse')
      .reduce((s, e) => s + e.amount, 0)
    const employeeReturn = Math.max(0, advanceTotal - expenseAdvanceTotal)
    const advanceTopUp = Math.max(0, expenseAdvanceTotal - advanceTotal)
    const companyPay = expenseReimburseTotal + advanceTopUp
    return {
      advanceTotal,
      expenseAdvanceTotal,
      expenseReimburseTotal,
      employeeReturn,
      companyPay,
      balance: companyPay - employeeReturn,
      companyPayByEmployee: expenses
        .filter((e) => e.funding === 'reimburse' && e.status === 'approved')
        .map((e) => ({
          employeeId: String(e.paidByEmployeeId),
          amount: e.amount
        })),
      note: 'Quyết toán demo',
      settledAt,
      settledBy
    }
  }

  let tripCount = 0
  const completedByMonth = new Map()
  for (const order of orders) {
    if (order.status !== 'completed') continue
    const key = `${order.createdAt.getFullYear()}-${order.createdAt.getMonth()}`
    if (!completedByMonth.has(key)) completedByMonth.set(key, [])
    completedByMonth.get(key).push(order)
  }

  for (let offset = 1 - MONTHS; offset <= 0; offset += 1) {
    const { year, month } = monthParts(offset)
    const startDay = clampDay(year, month, 8)
    const endDay = clampDay(year, month, 14)
    const startDate = at(year, month, startDay, 7)
    const endDate = at(year, month, endDay, 18)
    const key = `${year}-${month}`
    const monthOrders = (completedByMonth.get(key) || []).slice(0, 3)
    const member = offset % 2 === 0 ? empSales : empSales2
    const dealerA = activeDealers[0]
    const dealerB = activeDealers[Math.min(1, activeDealers.length - 1)]
    const advances = [
      {
        _id: oid(),
        amount: 2500000,
        note: 'Tạm ứng xăng + khách sạn',
        receiptUrl: '',
        receiptUrls: [],
        createdAt: startDate,
        createdBy: accountant._id
      }
    ]
    const expenses = [
      {
        _id: oid(),
        category: 'fuel',
        amount: 1200000,
        date: at(year, month, startDay, 16),
        funding: 'advance',
        paidByEmployeeId: null,
        receiptUrl: '',
        receiptUrls: [],
        note: 'Xăng xe',
        status: 'approved',
        createdAt: at(year, month, startDay, 16),
        createdBy: member.userId
      },
      {
        _id: oid(),
        category: 'lodging',
        amount: 800000,
        date: at(year, month, startDay + 1, 21),
        funding: 'advance',
        paidByEmployeeId: null,
        receiptUrl: '',
        receiptUrls: [],
        note: 'Khách sạn',
        status: 'approved',
        createdAt: at(year, month, Math.min(startDay + 1, endDay), 21),
        createdBy: member.userId
      },
      {
        _id: oid(),
        category: 'food',
        amount: 350000,
        date: at(year, month, startDay + 1, 12),
        funding: 'reimburse',
        paidByEmployeeId: member._id,
        receiptUrl: '',
        receiptUrls: [],
        note: 'Cơm đoàn — NV tự ứng',
        status: offset === 0 ? 'pending' : 'approved',
        createdAt: at(year, month, Math.min(startDay + 1, endDay), 12),
        createdBy: member.userId
      }
    ]
    const stops = [
      {
        _id: oid(),
        date: at(year, month, startDay, 9),
        dealerId: dealerA._id,
        location: dealerA.address,
        purpose: 'delivery',
        note: 'Giao hàng',
        lat: dealerA.lat,
        lng: dealerA.lng,
        locationSource: 'dealer'
      },
      {
        _id: oid(),
        date: at(year, month, Math.min(startDay + 1, endDay), 10),
        dealerId: dealerB._id,
        location: dealerB.address,
        purpose: 'collection',
        note: 'Thu công nợ',
        lat: dealerB.lat,
        lng: dealerB.lng,
        locationSource: 'dealer'
      }
    ]

    const isCurrent = offset === 0
    const status = isCurrent ? 'in_progress' : 'closed'
    const settlement =
      status === 'closed'
        ? settlementOf(
            advances,
            expenses,
            at(year, month, endDay, 19),
            accountant._id
          )
        : null

    const tripId = oid()
    const code = nextTripCode(startDate)
    await db.collection('trips').insertOne({
      _id: tripId,
      code,
      title: `Chuyến ${dealerA.region} — ${monthKey(offset)}`,
      region: dealerA.region,
      startDate,
      endDate,
      status,
      memberIds: [member._id, empKho._id],
      orderIds: monthOrders.map((o) => o._id),
      stops,
      advances,
      expenses,
      settlement,
      note: 'Chuyến demo',
      createdBy: sales._id,
      createdAt: at(year, month, Math.max(1, startDay - 2), 15),
      updatedAt: settlement?.settledAt || startDate,
      _destroy: false
    })
    if (monthOrders.length) {
      await db.collection('orders').updateMany(
        { _id: { $in: monthOrders.map((o) => o._id) } },
        { $set: { tripId } }
      )
    }
    tripCount += 1
  }

  const settleTripId = oid()
  const { year: cy, month: cm } = monthParts(0)
  const settleStart = at(cy, cm, clampDay(cy, cm, 4), 7)
  const settleEnd = at(cy, cm, clampDay(cy, cm, 7), 18)
  await db.collection('trips').insertOne({
    _id: settleTripId,
    code: nextTripCode(settleStart),
    title: 'Chuyến chờ quyết toán — Đông Nam Bộ',
    region: 'Đông Nam Bộ',
    startDate: settleStart,
    endDate: settleEnd,
    status: 'settlement',
    memberIds: [empSales2._id],
    orderIds: [],
    stops: [
      {
        _id: oid(),
        date: settleStart,
        dealerId: activeDealers[0]._id,
        location: activeDealers[0].address,
        purpose: 'meeting',
        note: 'Gặp đại lý',
        lat: activeDealers[0].lat,
        lng: activeDealers[0].lng,
        locationSource: 'dealer'
      }
    ],
    advances: [
      {
        _id: oid(),
        amount: 1500000,
        note: 'Ứng chuyến ngắn',
        receiptUrls: [],
        createdAt: settleStart,
        createdBy: accountant._id
      }
    ],
    expenses: [
      {
        _id: oid(),
        category: 'toll',
        amount: 180000,
        date: settleStart,
        funding: 'advance',
        status: 'approved',
        note: 'Vé cầu đường',
        receiptUrls: [],
        createdAt: settleStart,
        createdBy: empSales2.userId
      }
    ],
    settlement: null,
    note: 'Chờ kế toán quyết toán',
    createdBy: sales2._id,
    createdAt: settleStart,
    updatedAt: settleEnd,
    _destroy: false
  })
  tripCount += 1
  console.log(`Trips ${tripCount}`)

  const stockDocs = [...stock.entries()].map(([productId, quantity]) => ({
    warehouseId: warehouse._id,
    productId: new ObjectId(productId),
    quantity,
    updatedAt: new Date()
  }))
  if (stockDocs.length) {
    await db.collection('warehouse_stocks').insertMany(stockDocs)
  }

  let payrollCount = 0
  for (let offset = 1 - MONTHS; offset <= 0; offset += 1) {
    const period = monthKey(offset)
    const { year, month } = monthParts(offset)
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 1)
    const completed = orders.filter(
      (o) => o.status === 'completed' && o.createdAt >= start && o.createdAt < end
    )
    const salesByUser = new Map()
    for (const order of completed) {
      const id = String(order.createdBy)
      salesByUser.set(id, (salesByUser.get(id) || 0) + order.total)
    }

    const lines = employees
      .filter((e) => e.code !== 'NV005' || true)
      .map((employee) => {
        const userId = employee.userId ? String(employee.userId) : null
        const baseSalary = Number(employee.baseSalary) || 0
        const allowance = Number(employee.allowance) || 0
        const commissionPercent = Number(employee.commissionPercent) || 0
        const salesTotal = userId ? salesByUser.get(userId) || 0 : 0
        const commission = money((salesTotal * commissionPercent) / 100)
        const tripReimburse = offset < 0 && employee.code !== 'NV005' ? 350000 : 0
        return {
          employeeId: employee._id,
          employeeCode: employee.code,
          employeeName: employee.fullName,
          baseSalary,
          allowance,
          commissionPercent,
          salesTotal,
          commission,
          tripReimburse,
          net: baseSalary + allowance + commission + tripReimburse
        }
      })

    const locked = offset < 0
    const createdAt = at(year, month, clampDay(year, month, 28), 16)
    await db.collection('payroll_periods').insertOne({
      period,
      status: locked ? 'locked' : 'draft',
      lines,
      note: locked ? `Bảng lương demo ${period} (đã khóa)` : `Bảng lương demo ${period}`,
      createdBy: accountant._id,
      createdAt,
      updatedAt: locked ? createdAt : null,
      lockedAt: locked ? createdAt : null,
      lockedBy: locked ? accountant._id : null,
      _destroy: false
    })
    payrollCount += 1
  }
  console.log(`Payroll ${payrollCount} periods`)

  const staffIds = [admin._id, sales._id, sales2._id, warehouseUser._id, accountant._id]
  const notiSamples = [
    {
      type: 'order',
      title: 'Đơn mới cần xử lý',
      body: orders.find((o) => o.status === 'pending')
        ? `Đơn ${orders.find((o) => o.status === 'pending').code} đang chờ xác nhận`
        : 'Có đơn demo',
      href: '/orders',
      tag: 'order-pending'
    },
    {
      type: 'lead',
      title: 'Lead mới từ website',
      body: 'Shop Nông Nghiệp Bình Dương muốn làm đại lý cấp 2',
      href: '/leads',
      tag: 'lead-new'
    },
    {
      type: 'trip',
      title: 'Chuyến chờ quyết toán',
      body: 'Chuyến Đông Nam Bộ đã chuyển trạng thái settlement',
      href: '/trips',
      tag: 'trip-settle'
    },
    {
      type: 'payment',
      title: 'Công nợ đại lý',
      body: 'Có đơn hoàn tất chưa thu đủ — xem sổ công nợ',
      href: '/receivables',
      tag: 'ar'
    },
    {
      type: 'stock',
      title: 'Đã nhập kho đợt mới',
      body: `Nhập ${importCount} phiếu trong ${MONTHS} tháng demo`,
      href: '/inventory',
      tag: 'stock-in'
    }
  ]
  const notiDocs = []
  const now = new Date()
  for (const sample of notiSamples) {
    for (const userId of staffIds) {
      notiDocs.push({
        userId,
        type: sample.type,
        title: sample.title,
        body: sample.body,
        href: sample.href,
        tag: sample.tag,
        entityType: null,
        entityId: null,
        createdAt: new Date(now.getTime() - notiDocs.length * 3600000),
        readAt: null,
        _destroy: false
      })
    }
  }
  if (notiDocs.length) await db.collection('notifications').insertMany(notiDocs)

  console.log('---')
  console.log(`Products used: ${catalog.length}/${products.length}`)
  console.log(`Warehouse: ${warehouse.name}`)
  console.log(`Stock SKUs: ${stockDocs.length}`)
  console.log('')
  console.log('Login (password 123123):')
  console.log(`  admin        ${ADMIN_EMAIL}`)
  console.log('  sales        sales@asaka.local')
  console.log('  warehouse    warehouse@asaka.local')
  console.log('  accountant   accountant@asaka.local')
  console.log('Done.')
  await client.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
