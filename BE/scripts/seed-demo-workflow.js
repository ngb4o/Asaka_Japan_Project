/**
 * Seed demo workflow data for ASAKA CRM.
 * Usage (from BE/): node scripts/seed-demo-workflow.js
 *
 * CLEARS:
 *   orders, warehouse_stocks, inventory_transactions,
 *   leads, dealers, employees, trips, payroll_periods,
 *   quotes, token_blacklist, user_notification_states
 *   + deletes user ngbao08052003@gmail.com
 *   + removes non-admin users created for demo (recreates staff accounts)
 *
 * PRESERVES:
 *   products, product_categories, warehouses, news
 *   + keeps admin@asaka.local (or recreates if missing)
 *
 * Creates a full sample flow:
 *   leads → dealers → stock import → orders → export → trips → payroll
 */
require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')
const bcrypt = require('bcryptjs')

const TARGET_DELETE_EMAIL = 'ngbao08052003@gmail.com'
const ADMIN_EMAIL = 'admin@asaka.local'
const DEMO_PASSWORD = '123123'

const CLEAR_COLLECTIONS = [
  'orders',
  'warehouse_stocks',
  'inventory_transactions',
  'leads',
  'dealers',
  'employees',
  'trips',
  'payroll_periods',
  'quotes',
  'token_blacklist',
  'user_notification_states'
]

function daysAgo(n, hour = 10) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, 0, 0, 0)
  return d
}

function monthKey(offset = 0) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function main() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.DATABASE_NAME
  if (!uri || !dbName) throw new Error('Missing MONGODB_URI or DATABASE_NAME in .env')

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)
  console.log(`Connected: ${dbName}`)

  // ---- Clear ops data ----
  for (const name of CLEAR_COLLECTIONS) {
    const result = await db.collection(name).deleteMany({})
    console.log(`Cleared ${name}: ${result.deletedCount}`)
  }

  const deletedTarget = await db.collection('users').deleteMany({
    email: TARGET_DELETE_EMAIL
  })
  console.log(`Deleted ${TARGET_DELETE_EMAIL}: ${deletedTarget.deletedCount}`)

  // Remove previous demo staff accounts
  await db.collection('users').deleteMany({
    email: {
      $in: [
        'sales@asaka.local',
        'sales2@asaka.local',
        'warehouse@asaka.local',
        'accountant@asaka.local'
      ]
    }
  })
  console.log('Removed previous demo staff accounts (if any)')

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  let admin = await db.collection('users').findOne({ email: ADMIN_EMAIL })
  if (!admin) {
    const inserted = await db.collection('users').insertOne({
      email: ADMIN_EMAIL,
      username: 'admin',
      password: passwordHash,
      avatar: null,
      role: 'admin',
      createdAt: daysAgo(90),
      updatedAt: null,
      _destroy: false
    })
    admin = await db.collection('users').findOne({ _id: inserted.insertedId })
    console.log('Created admin account')
  } else {
    await db.collection('users').updateOne(
      { _id: admin._id },
      { $set: { password: passwordHash, role: 'admin', _destroy: false } }
    )
    console.log('Kept existing admin, reset password to 123123')
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

  if (!products.length) throw new Error('No active products found — cannot seed orders/stock')
  if (!warehouses.length) throw new Error('No active warehouses found — cannot seed stock')

  const warehouse = warehouses[0]
  const pickProducts = products.slice(0, Math.min(6, products.length))

  // ---- Staff users + employees ----
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

  const usersByKey = { admin }
  const employeesByCode = {}

  for (const def of staffDefs) {
    const userRes = await db.collection('users').insertOne({
      email: def.email,
      username: def.username,
      password: passwordHash,
      avatar: null,
      role: def.role,
      createdAt: daysAgo(60),
      updatedAt: null,
      _destroy: false
    })
    const userId = userRes.insertedId
    usersByKey[def.username] = { _id: userId, ...def }

    const empRes = await db.collection('employees').insertOne({
      code: def.employee.code,
      fullName: def.employee.fullName,
      phone: def.employee.phone,
      email: def.email,
      title: def.employee.title,
      department: def.employee.department,
      userId,
      baseSalary: def.employee.baseSalary,
      commissionPercent: def.employee.commissionPercent,
      allowance: def.employee.allowance,
      bankAccount: def.employee.bankAccount,
      bankName: def.employee.bankName,
      bankQrImage: '',
      status: 'active',
      note: 'Nhân viên demo quy trình ASAKA',
      createdBy: admin._id,
      createdAt: daysAgo(55),
      updatedAt: null,
      _destroy: false
    })
    employeesByCode[def.employee.code] = {
      _id: empRes.insertedId,
      userId,
      ...def.employee,
      email: def.email
    }
  }

  const salesUser = usersByKey.sales01
  const sales2User = usersByKey.sales02
  const warehouseUser = usersByKey.kho01
  const accountantUser = usersByKey.ketoan01

  // ---- Leads ----
  const leadDocs = [
    {
      name: 'Công ty TNHH Nông Sản Miền Tây',
      phone: '0902222001',
      email: 'lienhe@nongsansmt.vn',
      company: 'Nông Sản Miền Tây',
      region: 'Cần Thơ',
      message: 'Muốn làm đại lý phân phối phân bón hữu cơ khu vực ĐBSCL',
      type: 'dealer',
      source: 'website',
      status: 'converted',
      note: 'Đã chuyển thành đại lý',
      createdAt: daysAgo(45, 9)
    },
    {
      name: 'Anh Hoàng - Vựa thuốc BVTV Long An',
      phone: '0902222002',
      email: 'hoang.longan@gmail.com',
      company: 'Vựa Long An',
      region: 'Long An',
      message: 'Cần báo giá lô hàng lớn',
      type: 'dealer',
      source: 'facebook',
      status: 'converted',
      note: 'Đã chốt hợp tác',
      createdAt: daysAgo(40, 14)
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
      note: 'Đang chờ hợp đồng',
      createdAt: daysAgo(12, 11)
    },
    {
      name: 'Anh Bình',
      phone: '0902222004',
      email: '',
      company: '',
      region: 'TP.HCM',
      message: 'Hỏi mua lẻ cho trang trại nhỏ',
      type: 'contact',
      source: 'zalo',
      status: 'contacted',
      note: 'Đã gọi tư vấn',
      createdAt: daysAgo(5, 16)
    },
    {
      name: 'Shop Nông Nghiệp Bình Dương',
      phone: '0902222005',
      email: 'shopbd@gmail.com',
      company: 'Shop NN Bình Dương',
      region: 'Bình Dương',
      message: 'Muốn trở thành đại lý cấp 2',
      type: 'dealer',
      source: 'website',
      status: 'new',
      note: '',
      createdAt: daysAgo(1, 8)
    }
  ]

  const leadIds = []
  for (const lead of leadDocs) {
    const res = await db.collection('leads').insertOne({
      ...lead,
      dealerId: null,
      updatedAt: null,
      _destroy: false
    })
    leadIds.push(res.insertedId)
  }

  // ---- Dealers ----
  const dealerDefs = [
    {
      name: 'Đại lý Nông Sản Miền Tây',
      contactName: 'Nguyễn Văn Đông',
      phone: '0902222001',
      email: 'lienhe@nongsansmt.vn',
      address: '12 Nguyễn Văn Cừ, Ninh Kiều, Cần Thơ',
      region: 'Cần Thơ',
      tier: 'gold',
      discountPercent: 8,
      status: 'active',
      leadId: leadIds[0],
      createdBy: salesUser._id,
      createdAt: daysAgo(44)
    },
    {
      name: 'Đại lý Long An Agro',
      contactName: 'Hoàng Minh',
      phone: '0902222002',
      email: 'hoang.longan@gmail.com',
      address: '45 Quốc lộ 1A, Bến Lức, Long An',
      region: 'Long An',
      tier: 'silver',
      discountPercent: 5,
      status: 'active',
      leadId: leadIds[1],
      createdBy: sales2User._id,
      createdAt: daysAgo(38)
    },
    {
      name: 'Đại lý Tây Nguyên Green',
      contactName: 'Phạm Quốc Bảo',
      phone: '0903333001',
      email: 'taynguyen.green@gmail.com',
      address: '88 Phan Đình Phùng, Đà Lạt',
      region: 'Lâm Đồng',
      tier: 'standard',
      discountPercent: 3,
      status: 'active',
      leadId: null,
      createdBy: salesUser._id,
      createdAt: daysAgo(30)
    },
    {
      name: 'Đại lý Đông Nam Bộ',
      contactName: 'Võ Thanh Sơn',
      phone: '0903333002',
      email: 'dongnambo@gmail.com',
      address: '21 Đại lộ Bình Dương, Thủ Dầu Một',
      region: 'Bình Dương',
      tier: 'silver',
      discountPercent: 5,
      status: 'pending',
      leadId: null,
      createdBy: sales2User._id,
      createdAt: daysAgo(7)
    }
  ]

  const dealers = []
  for (const d of dealerDefs) {
    const res = await db.collection('dealers').insertOne({
      ...d,
      note: 'Đại lý demo quy trình',
      updatedAt: null,
      _destroy: false
    })
    dealers.push({ _id: res.insertedId, ...d })
  }

  await db.collection('leads').updateOne(
    { _id: leadIds[0] },
    { $set: { dealerId: dealers[0]._id, updatedAt: daysAgo(44) } }
  )
  await db.collection('leads').updateOne(
    { _id: leadIds[1] },
    { $set: { dealerId: dealers[1]._id, updatedAt: daysAgo(38) } }
  )

  // ---- Stock import + warehouse_stocks ----
  const stockLevels = {}
  const importBatches = [
    { days: 35, factor: 1.0 },
    { days: 20, factor: 0.6 },
    { days: 8, factor: 0.4 }
  ]

  for (const batch of importBatches) {
    for (let i = 0; i < pickProducts.length; i += 1) {
      const product = pickProducts[i]
      const unitsPerCase = product.unitsPerCase || 1
      const cases = 20 + i * 5
      const qtyBase = Math.round(cases * unitsPerCase * batch.factor)
      const key = String(product._id)
      stockLevels[key] = (stockLevels[key] || 0) + qtyBase

      await db.collection('inventory_transactions').insertOne({
        type: 'import',
        warehouseId: warehouse._id,
        productId: product._id,
        quantity: Math.max(1, Math.round(cases * batch.factor)),
        unitType: 'thung',
        quantityBase: qtyBase,
        unitsPerCase,
        note: `Nhập kho demo đợt ${batch.days} ngày trước`,
        balanceAfter: stockLevels[key],
        createdBy: warehouseUser._id,
        createdAt: daysAgo(batch.days, 9 + i)
      })
    }
  }

  // ---- Orders across statuses ----
  function buildItems(indices, qtyMul = 1) {
    const items = indices.map((idx, i) => {
      const product = pickProducts[idx % pickProducts.length]
      const quantity = Math.max(2, Math.round((8 + i * 3) * qtyMul))
      const unitPrice = product.price || 50000
      return {
        productId: product._id,
        productName: product.name,
        quantity,
        unitPrice,
        lineTotal: quantity * unitPrice
      }
    })
    const subtotal = items.reduce((s, it) => s + it.lineTotal, 0)
    return { items, subtotal }
  }

  const orderDefs = [
    {
      code: 'DH-DEMO-001',
      dealer: dealers[0],
      createdBy: salesUser._id,
      status: 'completed',
      paymentStatus: 'paid',
      paidRatio: 1,
      discount: 200000,
      createdAt: daysAgo(28, 10),
      shipped: true,
      exported: true,
      indices: [0, 1, 2],
      qtyMul: 1.2
    },
    {
      code: 'DH-DEMO-002',
      dealer: dealers[1],
      createdBy: sales2User._id,
      status: 'completed',
      paymentStatus: 'paid',
      paidRatio: 1,
      discount: 0,
      createdAt: daysAgo(22, 11),
      shipped: true,
      exported: true,
      indices: [1, 3],
      qtyMul: 0.9
    },
    {
      code: 'DH-DEMO-003',
      dealer: dealers[2],
      createdBy: salesUser._id,
      status: 'delivering',
      paymentStatus: 'partial',
      paidRatio: 0.5,
      discount: 100000,
      createdAt: daysAgo(10, 9),
      shipped: true,
      exported: true,
      indices: [0, 2, 4 % pickProducts.length],
      qtyMul: 1
    },
    {
      code: 'DH-DEMO-004',
      dealer: dealers[0],
      createdBy: salesUser._id,
      status: 'confirmed',
      paymentStatus: 'unpaid',
      paidRatio: 0,
      discount: 0,
      createdAt: daysAgo(4, 15),
      shipped: false,
      exported: false,
      indices: [2, 3],
      qtyMul: 0.7
    },
    {
      code: 'DH-DEMO-005',
      dealer: dealers[1],
      createdBy: sales2User._id,
      status: 'pending',
      paymentStatus: 'unpaid',
      paidRatio: 0,
      discount: 50000,
      createdAt: daysAgo(1, 8),
      shipped: false,
      exported: false,
      indices: [0, 1],
      qtyMul: 0.5
    },
    {
      code: 'DH-DEMO-006',
      dealer: dealers[3],
      createdBy: sales2User._id,
      status: 'cancelled',
      paymentStatus: 'unpaid',
      paidRatio: 0,
      discount: 0,
      createdAt: daysAgo(6, 13),
      shipped: false,
      exported: false,
      indices: [1],
      qtyMul: 0.4
    },
    {
      code: 'DH-DEMO-007',
      dealer: dealers[2],
      createdBy: salesUser._id,
      status: 'completed',
      paymentStatus: 'partial',
      paidRatio: 0.7,
      discount: 150000,
      createdAt: daysAgo(15, 10),
      shipped: true,
      exported: true,
      indices: [0, 1, 2, 3],
      qtyMul: 1.1
    }
  ]

  const orders = []
  for (const def of orderDefs) {
    const { items, subtotal } = buildItems(def.indices, def.qtyMul)
    const total = Math.max(0, subtotal - def.discount)
    const paidAmount = Math.round(total * def.paidRatio)
    const orderId = new ObjectId()

    // Export stock for exported orders
    if (def.exported) {
      for (const item of items) {
        const key = String(item.productId)
        const product = pickProducts.find((p) => String(p._id) === key)
        const unitsPerCase = product?.unitsPerCase || 1
        stockLevels[key] = Math.max(0, (stockLevels[key] || 0) - item.quantity)
        await db.collection('inventory_transactions').insertOne({
          type: 'export',
          warehouseId: warehouse._id,
          productId: item.productId,
          quantity: item.quantity,
          unitType: 'chai',
          quantityBase: item.quantity,
          unitsPerCase,
          note: `Xuất kho theo đơn ${def.code}`,
          balanceAfter: stockLevels[key],
          createdBy: warehouseUser._id,
          createdAt: new Date(def.createdAt.getTime() + 2 * 60 * 60 * 1000)
        })
      }
    }

    await db.collection('orders').insertOne({
      _id: orderId,
      code: def.code,
      dealerId: def.dealer._id,
      quoteId: null,
      warehouseId: warehouse._id,
      tripId: null,
      customerName: def.dealer.name,
      customerPhone: def.dealer.phone,
      customerEmail: def.dealer.email,
      items,
      subtotal,
      discount: def.discount,
      total,
      status: def.status,
      note: 'Đơn hàng demo quy trình ASAKA',
      inventoryExported: def.exported,
      paymentStatus: def.paymentStatus,
      paidAmount,
      paymentNote: def.paymentStatus === 'paid' ? 'Đã thu đủ' : def.paymentStatus === 'partial' ? 'Thu một phần' : '',
      shippingAddress: def.dealer.address,
      shippingContactName: def.dealer.contactName,
      shippingPhone: def.dealer.phone,
      carrier: def.shipped ? 'Xe công ty' : '',
      trackingCode: def.shipped ? `TRK-${def.code.slice(-3)}` : '',
      shippingDate: def.shipped ? new Date(def.createdAt.getTime() + 24 * 60 * 60 * 1000) : null,
      deliveredAt:
        def.status === 'completed'
          ? new Date(def.createdAt.getTime() + 3 * 24 * 60 * 60 * 1000)
          : null,
      shippingFee: def.shipped ? 150000 : 0,
      shippingNote: def.shipped ? 'Giao trong giờ hành chính' : '',
      createdBy: def.createdBy,
      createdAt: def.createdAt,
      updatedAt: daysAgo(0, 12),
      _destroy: false
    })

    orders.push({ _id: orderId, ...def, total, paidAmount, items })
  }

  // Persist final stock balances
  for (const product of pickProducts) {
    const key = String(product._id)
    // leave one product intentionally low for dashboard warning
    let qty = stockLevels[key] || 0
    if (product === pickProducts[pickProducts.length - 1]) {
      qty = Math.min(qty, 12)
      stockLevels[key] = qty
    }
    await db.collection('warehouse_stocks').insertOne({
      warehouseId: warehouse._id,
      productId: product._id,
      quantity: qty,
      updatedAt: new Date()
    })
  }

  // Add a bit of stock for remaining products (not in pick list) so inventory isn't empty
  for (const product of products.slice(pickProducts.length, pickProducts.length + 4)) {
    const qty = 40 + Math.floor(Math.random() * 60)
    await db.collection('warehouse_stocks').insertOne({
      warehouseId: warehouse._id,
      productId: product._id,
      quantity: qty,
      updatedAt: new Date()
    })
    await db.collection('inventory_transactions').insertOne({
      type: 'import',
      warehouseId: warehouse._id,
      productId: product._id,
      quantity: qty,
      unitType: 'chai',
      quantityBase: qty,
      unitsPerCase: product.unitsPerCase || 1,
      note: 'Nhập tồn nền demo',
      balanceAfter: qty,
      createdBy: warehouseUser._id,
      createdAt: daysAgo(25, 10)
    })
  }

  // ---- Trips ----
  const tripOrderIds = [orders[0]._id, orders[2]._id]
  const empTuấn = employeesByCode.NV001
  const empHạnh = employeesByCode.NV002

  await db.collection('trips').insertOne({
    code: 'CT-DEMO-001',
    title: 'Công tác giao hàng ĐBSCL',
    region: 'Cần Thơ - Long An',
    startDate: daysAgo(12),
    endDate: daysAgo(10),
    status: 'closed',
    memberIds: [empTuấn._id, empHạnh._id],
    orderIds: tripOrderIds,
    stops: [
      {
        id: new ObjectId().toString(),
        date: daysAgo(12).toISOString().slice(0, 10),
        dealerId: dealers[0]._id.toString(),
        dealerName: dealers[0].name,
        location: dealers[0].address,
        purpose: 'delivery',
        note: 'Giao đơn DH-DEMO-001'
      },
      {
        id: new ObjectId().toString(),
        date: daysAgo(11).toISOString().slice(0, 10),
        dealerId: dealers[1]._id.toString(),
        dealerName: dealers[1].name,
        location: dealers[1].address,
        purpose: 'collection',
        note: 'Thu công nợ'
      }
    ],
    advances: [
      {
        id: new ObjectId().toString(),
        amount: 3000000,
        date: daysAgo(13).toISOString().slice(0, 10),
        note: 'Tạm ứng xăng xe + ăn uống',
        createdBy: accountantUser._id.toString(),
        createdAt: daysAgo(13)
      }
    ],
    expenses: [
      {
        id: new ObjectId().toString(),
        category: 'fuel',
        amount: 1200000,
        date: daysAgo(12).toISOString().slice(0, 10),
        funding: 'advance',
        status: 'approved',
        note: 'Xăng xe',
        createdBy: salesUser._id.toString(),
        createdAt: daysAgo(12)
      },
      {
        id: new ObjectId().toString(),
        category: 'food',
        amount: 650000,
        date: daysAgo(11).toISOString().slice(0, 10),
        funding: 'advance',
        status: 'approved',
        note: 'Ăn uống đoàn',
        createdBy: salesUser._id.toString(),
        createdAt: daysAgo(11)
      },
      {
        id: new ObjectId().toString(),
        category: 'lodging',
        amount: 900000,
        date: daysAgo(11).toISOString().slice(0, 10),
        funding: 'reimburse',
        status: 'approved',
        note: 'Khách sạn 1 đêm',
        createdBy: sales2User._id.toString(),
        createdAt: daysAgo(11)
      }
    ],
    settlement: {
      advanceTotal: 3000000,
      expenseAdvanceTotal: 1850000,
      expenseReimburseTotal: 900000,
      employeeReturn: 1150000,
      companyPay: 900000,
      balance: -250000,
      settledAt: daysAgo(9),
      settledBy: accountantUser._id.toString(),
      note: 'Quyết toán đủ'
    },
    note: 'Chuyến demo đã đóng',
    createdBy: salesUser._id,
    createdAt: daysAgo(13),
    updatedAt: daysAgo(9),
    _destroy: false
  })

  // Link orders to trip
  await db.collection('orders').updateMany(
    { _id: { $in: tripOrderIds } },
    { $set: { tripId: (await db.collection('trips').findOne({ code: 'CT-DEMO-001' }))._id } }
  )

  await db.collection('trips').insertOne({
    code: 'CT-DEMO-002',
    title: 'Công tác khảo sát Tây Nguyên',
    region: 'Lâm Đồng',
    startDate: daysAgo(2),
    endDate: daysAgo(0),
    status: 'in_progress',
    memberIds: [empTuấn._id],
    orderIds: [orders[2]._id],
    stops: [
      {
        id: new ObjectId().toString(),
        date: daysAgo(1).toISOString().slice(0, 10),
        dealerId: dealers[2]._id.toString(),
        dealerName: dealers[2].name,
        location: dealers[2].address,
        purpose: 'meeting',
        note: 'Gặp đại lý tư vấn đơn giao'
      }
    ],
    advances: [
      {
        id: new ObjectId().toString(),
        amount: 2000000,
        date: daysAgo(3).toISOString().slice(0, 10),
        note: 'Tạm ứng công tác',
        createdBy: accountantUser._id.toString(),
        createdAt: daysAgo(3)
      }
    ],
    expenses: [
      {
        id: new ObjectId().toString(),
        category: 'fuel',
        amount: 700000,
        date: daysAgo(1).toISOString().slice(0, 10),
        funding: 'advance',
        status: 'pending',
        note: 'Xăng chờ duyệt',
        createdBy: salesUser._id.toString(),
        createdAt: daysAgo(1)
      }
    ],
    settlement: null,
    note: 'Đang diễn ra',
    createdBy: salesUser._id,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
    _destroy: false
  })

  // Fix endDate for in-progress trip to be in the future cleanly
  const futureEnd = new Date()
  futureEnd.setDate(futureEnd.getDate() + 2)
  futureEnd.setHours(18, 0, 0, 0)
  await db.collection('trips').updateOne(
    { code: 'CT-DEMO-002' },
    { $set: { endDate: futureEnd } }
  )

  // ---- Payroll draft for current month ----
  const period = monthKey(0)
  const empList = Object.values(employeesByCode)
  const lines = empList.map((emp) => {
    let commissionBase = 0
    if (emp.code === 'NV001') {
      commissionBase = orders
        .filter((o) => String(o.createdBy) === String(salesUser._id) && o.status !== 'cancelled')
        .reduce((s, o) => s + o.total, 0)
    }
    if (emp.code === 'NV002') {
      commissionBase = orders
        .filter((o) => String(o.createdBy) === String(sales2User._id) && o.status !== 'cancelled')
        .reduce((s, o) => s + o.total, 0)
    }
    const commission = Math.round((commissionBase * (emp.commissionPercent || 0)) / 100)
    const tripReimburse = emp.code === 'NV002' ? 900000 : 0
    const total = emp.baseSalary + emp.allowance + commission + tripReimburse
    return {
      employeeId: emp._id.toString(),
      employeeCode: emp.code,
      employeeName: emp.fullName,
      baseSalary: emp.baseSalary,
      allowance: emp.allowance,
      commissionPercent: emp.commissionPercent,
      commission,
      tripReimburse,
      total,
      note: ''
    }
  })

  await db.collection('payroll_periods').insertOne({
    period,
    status: 'draft',
    lines,
    note: 'Bảng lương demo tháng hiện tại',
    createdBy: accountantUser._id,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
    lockedAt: null,
    lockedBy: null,
    _destroy: false
  })

  // Summary
  const summary = {
    productsPreserved: products.length,
    warehousesPreserved: warehouses.length,
    leads: await db.collection('leads').countDocuments(),
    dealers: await db.collection('dealers').countDocuments(),
    orders: await db.collection('orders').countDocuments(),
    stocks: await db.collection('warehouse_stocks').countDocuments(),
    inventoryTx: await db.collection('inventory_transactions').countDocuments(),
    employees: await db.collection('employees').countDocuments(),
    trips: await db.collection('trips').countDocuments(),
    payroll: await db.collection('payroll_periods').countDocuments(),
    users: await db.collection('users').countDocuments({ _destroy: { $ne: true } })
  }

  console.log('\nSeed completed.')
  console.log(JSON.stringify(summary, null, 2))
  console.log('\nLogin accounts (password: 123123):')
  console.log('  admin@asaka.local        · admin')
  console.log('  sales@asaka.local        · sales')
  console.log('  sales2@asaka.local       · sales')
  console.log('  warehouse@asaka.local    · warehouse')
  console.log('  accountant@asaka.local   · accountant')
  console.log(`\nDeleted account: ${TARGET_DELETE_EMAIL}`)
  console.log('Preserved: products, product_categories, warehouses, news')

  await client.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
