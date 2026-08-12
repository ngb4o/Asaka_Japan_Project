/**
 * Xóa dữ liệu vận hành; giữ catalog + định nghĩa kho + tin tức + admin.
 *
 * GIỮ:
 *   products, product_categories, warehouses, news
 *   users có role admin (nếu không còn admin → tạo admin@asaka.local / 123123)
 *
 * XÓA:
 *   tồn kho hiện tại, lịch sử nhập xuất, phiếu mua,
 *   đơn hàng, đại lý, lead, chuyến, lương, nhân viên, NCC,
 *   thông báo, session, user không phải admin
 *
 * Usage (from BE/): npm run wipe-catalog
 *                   node scripts/wipe-keep-catalog.js
 */
require('dotenv').config()
const { MongoClient } = require('mongodb')
const bcrypt = require('bcryptjs')

const ADMIN_EMAIL = 'admin@asaka.local'
const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = '123123'

const KEEP = ['news', 'products', 'product_categories', 'warehouses']

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
  'token_blacklist',
  'telegram_contacts',
  'telegram_action_messages'
]

function isAdminUser(user) {
  if (user.role === 'admin') return true
  return Array.isArray(user.roles) && user.roles.includes('admin')
}

async function main() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.DATABASE_NAME

  if (!uri || !dbName) {
    throw new Error('Missing MONGODB_URI or DATABASE_NAME in .env')
  }

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)

  console.log(`DB: ${dbName}`)
  console.log('KEEP:', KEEP.join(', '), '+ admin users')
  console.log('CLEAR:', CLEAR.join(', '))
  console.log('---')

  for (const name of CLEAR) {
    const exists = await db.listCollections({ name }).hasNext()
    if (!exists) {
      console.log(`Skip ${name} (not found)`)
      continue
    }
    const result = await db.collection(name).deleteMany({})
    console.log(`Cleared ${name}: ${result.deletedCount}`)
  }

  const users = await db.collection('users').find({}).toArray()
  const adminIds = users.filter(isAdminUser).map((user) => user._id)
  const removedUsers = await db.collection('users').deleteMany({
    _id: { $nin: adminIds }
  })
  console.log(`Removed non-admin users: ${removedUsers.deletedCount}`)

  let adminCount = await db.collection('users').countDocuments({
    $or: [{ role: 'admin' }, { roles: 'admin' }]
  })

  if (adminCount === 0) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
    await db.collection('users').insertOne({
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      password: passwordHash,
      avatar: null,
      role: 'admin',
      roles: ['admin'],
      createdAt: new Date(),
      updatedAt: null,
      _destroy: false
    })
    adminCount = 1
    console.log(`Seeded admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
  }

  console.log('---')
  for (const name of KEEP) {
    const count = await db.collection(name).countDocuments({})
    console.log(`Kept ${name}: ${count} docs`)
  }
  console.log(`Kept admin users: ${adminCount}`)

  await client.close()
  console.log('Done.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
