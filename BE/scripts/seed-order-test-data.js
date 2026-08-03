/**
 * Seed dữ liệu ảo đủ để test tạo đơn hàng.
 * KHÔNG xóa news / products / categories / warehouses.
 *
 * Tạo: dealers (active), tồn kho + phiếu nhập, employees,
 *      tài khoản demo (nếu thiếu).
 *
 * Usage: node scripts/seed-order-test-data.js
 */
require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')
const bcrypt = require('bcryptjs')

const DEMO_PASSWORD = '123123'
const ADMIN_EMAIL = 'admin@asaka.local'

function daysAgo(n, hour = 10) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, Math.floor(Math.random() * 50), 0, 0)
  return d
}

async function main() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.DATABASE_NAME
  if (!uri || !dbName) throw new Error('Missing MONGODB_URI or DATABASE_NAME')

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)
  console.log(`Connected: ${dbName}`)

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  let admin = await db.collection('users').findOne({
    email: ADMIN_EMAIL,
    _destroy: { $ne: true }
  })
  if (!admin) {
    const res = await db.collection('users').insertOne({
      email: ADMIN_EMAIL,
      username: 'admin',
      password: passwordHash,
      avatar: null,
      role: 'admin',
      roles: ['admin'],
      createdAt: daysAgo(90),
      updatedAt: null,
      _destroy: false
    })
    admin = await db.collection('users').findOne({ _id: res.insertedId })
    console.log('Created admin@asaka.local / 123123')
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

  if (!products.length) throw new Error('Chưa có sản phẩm active')
  if (!warehouses.length) throw new Error('Chưa có kho active')

  // ---- Staff + employees (upsert by email) ----
  const staffDefs = [
    {
      email: 'sales@asaka.local',
      username: 'sales01',
      role: 'sales',
      employee: {
        code: 'NV001',
        fullName: 'Nguyễn Minh Tuấn',
        phone: '0901111001',
        title: 'Nhân viên kinh doanh',
        department: 'Kinh doanh',
        baseSalary: 12000000,
        commissionPercent: 2.5,
        allowance: 1000000
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
        allowance: 500000
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
        allowance: 700000
      }
    }
  ]

  const deliveryEmployeeIds = []

  for (const def of staffDefs) {
    let user = await db.collection('users').findOne({ email: def.email })
    if (!user) {
      const userRes = await db.collection('users').insertOne({
        email: def.email,
        username: def.username,
        password: passwordHash,
        avatar: null,
        role: def.role,
        roles: [def.role],
        createdAt: daysAgo(60),
        updatedAt: null,
        _destroy: false
      })
      user = await db.collection('users').findOne({ _id: userRes.insertedId })
      console.log(`Created user ${def.email}`)
    } else {
      await db.collection('users').updateOne(
        { _id: user._id },
        {
          $set: {
            password: passwordHash,
            role: def.role,
            roles: [def.role],
            _destroy: false
          }
        }
      )
    }

    let emp = await db.collection('employees').findOne({
      code: def.employee.code,
      _destroy: { $ne: true }
    })
    if (!emp) {
      const empRes = await db.collection('employees').insertOne({
        code: def.employee.code,
        fullName: def.employee.fullName,
        phone: def.employee.phone,
        email: def.email,
        title: def.employee.title,
        department: def.employee.department,
        userId: user._id,
        baseSalary: def.employee.baseSalary,
        commissionPercent: def.employee.commissionPercent,
        allowance: def.employee.allowance,
        bankAccount: '',
        bankName: '',
        bankQrImage: '',
        status: 'active',
        note: 'Nhân viên demo test đơn hàng',
        createdBy: admin._id,
        createdAt: daysAgo(50),
        updatedAt: null,
        _destroy: false
      })
      emp = await db.collection('employees').findOne({ _id: empRes.insertedId })
      console.log(`Created employee ${def.employee.code} — ${def.employee.fullName}`)
    }
    deliveryEmployeeIds.push(emp._id)
  }

  // ---- Dealers ----
  const dealerCount = await db.collection('dealers').countDocuments({
    _destroy: { $ne: true }
  })
  if (dealerCount === 0) {
    const dealers = [
      {
        name: 'Đại lý Nông Sản Miền Tây',
        contactName: 'Anh Hùng',
        phone: '0903001001',
        email: 'mien tay@nongsan.vn'.replace(' ', ''),
        address: '12 Trần Hưng Đạo, Ninh Kiều, Cần Thơ',
        region: 'Cần Thơ',
        tier: 'gold',
        discountPercent: 8,
        status: 'active',
        note: 'Đại lý vùng ĐBSCL — ưu tiên giao thứ 3/6'
      },
      {
        name: 'Vựa thuốc BVTV Long An',
        contactName: 'Anh Hoàng',
        phone: '0903001002',
        email: 'hoang.longan@gmail.com',
        address: '45 Quốc lộ 1A, Bến Lức, Long An',
        region: 'Long An',
        tier: 'silver',
        discountPercent: 5,
        status: 'active',
        note: 'Lấy hàng thường xuyên, thanh toán 7 ngày'
      },
      {
        name: 'HTX Rau Sạch Đà Lạt',
        contactName: 'Chị Lan',
        phone: '0903001003',
        email: 'lan.dalat@gmail.com',
        address: '88 Phan Đình Phùng, Đà Lạt, Lâm Đồng',
        region: 'Lâm Đồng',
        tier: 'silver',
        discountPercent: 5,
        status: 'active',
        note: 'Đặt theo mùa vụ rau'
      },
      {
        name: 'Shop Nông Nghiệp Bình Dương',
        contactName: 'Anh Đức',
        phone: '0903001004',
        email: 'shopbd@gmail.com',
        address: '22 Đại lộ Bình Dương, Thủ Dầu Một',
        region: 'Bình Dương',
        tier: 'bronze',
        discountPercent: 3,
        status: 'active',
        note: 'Bán lẻ + sỉ nhỏ'
      },
      {
        name: 'Công ty TNHH Agri Đông Nam',
        contactName: 'Chị Mai',
        phone: '0903001005',
        email: 'mai@agridongnam.vn',
        address: '15 Nguyễn Văn Linh, Quận 7, TP.HCM',
        region: 'TP.HCM',
        tier: 'gold',
        discountPercent: 10,
        status: 'active',
        note: 'Đối tác chiến lược khu vực HCM'
      },
      {
        name: 'Đại lý chờ duyệt - Tây Ninh',
        contactName: 'Anh Phong',
        phone: '0903001099',
        email: '',
        address: 'Tây Ninh',
        region: 'Tây Ninh',
        tier: 'bronze',
        discountPercent: 0,
        status: 'pending',
        note: 'Chưa duyệt — không dùng cho đơn'
      }
    ]

    for (const d of dealers) {
      await db.collection('dealers').insertOne({
        ...d,
        leadId: null,
        createdBy: admin._id,
        createdAt: daysAgo(20 + Math.floor(Math.random() * 20)),
        updatedAt: null,
        _destroy: false
      })
    }
    console.log(`Created ${dealers.length} dealers (5 active + 1 pending)`)
  } else {
    console.log(`Keep existing dealers: ${dealerCount}`)
  }

  // ---- Stock import into every active warehouse ----
  // Clear empty leftover stocks for clean demo qty
  await db.collection('warehouse_stocks').deleteMany({})
  await db.collection('inventory_transactions').deleteMany({})

  let txnCount = 0
  for (const warehouse of warehouses) {
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      const unitsPerCase = Math.max(1, Number(product.unitsPerCase) || 1)
      // Realistic stock: 40–200 thùng worth, stored as chai
      const cases = 40 + ((i * 17) % 80)
      const quantityBase = cases * unitsPerCase
      const costPerBottle = Math.max(0, Number(product.costPrice) || 50000)
      const unitCost = costPerBottle // import theo chai
      const totalCost = unitCost * quantityBase

      await db.collection('warehouse_stocks').insertOne({
        warehouseId: warehouse._id,
        productId: product._id,
        quantity: quantityBase,
        updatedAt: new Date(),
        createdAt: daysAgo(10)
      })

      await db.collection('inventory_transactions').insertOne({
        type: 'import',
        warehouseId: warehouse._id,
        productId: product._id,
        quantity: quantityBase,
        unitType: 'chai',
        quantityBase,
        unitsPerCase,
        note: `Nhập lô demo test đơn — ${warehouse.name}`,
        unitCost,
        totalCost,
        balanceAfter: quantityBase,
        createdBy: admin._id,
        createdAt: daysAgo(8 - (i % 5), 9)
      })
      txnCount += 1
    }
  }
  console.log(
    `Stocked ${products.length} products × ${warehouses.length} warehouse(s), ${txnCount} import txns`
  )

  // ---- A couple of leads for realism ----
  const leadCount = await db.collection('leads').countDocuments({
    _destroy: { $ne: true }
  })
  if (leadCount === 0) {
    await db.collection('leads').insertMany([
      {
        name: 'Anh Bình',
        phone: '0902222004',
        email: '',
        company: '',
        region: 'TP.HCM',
        message: 'Hỏi mua lẻ cho trang trại nhỏ',
        type: 'contact',
        source: 'zalo',
        status: 'new',
        note: '',
        dealerId: null,
        createdBy: admin._id,
        createdAt: daysAgo(2, 16),
        updatedAt: null,
        _destroy: false
      },
      {
        name: 'Shop Phân Bón Đồng Nai',
        phone: '0902222010',
        email: 'pb.dongnai@gmail.com',
        company: 'Shop Phân Bón Đồng Nai',
        region: 'Đồng Nai',
        message: 'Muốn làm đại lý cấp 2',
        type: 'dealer',
        source: 'website',
        status: 'new',
        note: '',
        dealerId: null,
        createdBy: admin._id,
        createdAt: daysAgo(1, 10),
        updatedAt: null,
        _destroy: false
      }
    ])
    console.log('Created 2 sample leads')
  }

  const activeDealers = await db
    .collection('dealers')
    .find({ _destroy: { $ne: true }, status: 'active' })
    .project({ name: 1, region: 1, phone: 1 })
    .toArray()

  console.log('\n=== Sẵn sàng tạo đơn ===')
  console.log(`Kho: ${warehouses.map((w) => w.name).join(', ')}`)
  console.log(`SP active: ${products.length} (đã có tồn)`)
  console.log('Đại lý active:')
  for (const d of activeDealers) {
    console.log(`  - ${d.name} (${d.region}) ${d.phone}`)
  }
  console.log('\nTài khoản demo (password: 123123):')
  console.log('  admin@asaka.local / sales@asaka.local / warehouse@asaka.local / accountant@asaka.local')
  console.log('\nGợi ý test: Đơn hàng → Tạo đơn → chọn đại lý + kho TP.HCM + 2–3 SP → Lưu (pending) → Xác nhận xuất kho.')

  await client.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
