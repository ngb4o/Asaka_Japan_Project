/**
 * Wipe operational data; keep catalog + warehouse defs + news.
 *
 * KEEP: news, products, product_categories, warehouses
 * CLEAR: stocks, inventory history, orders/audits, dealers, leads,
 *        trips, payroll, employees, quotes, notifications, push,
 *        token blacklist. Users kept (login still works).
 *
 * Usage (from BE/): node scripts/wipe-keep-catalog.js
 */
require('dotenv').config()
const { MongoClient } = require('mongodb')

const CLEAR = [
  'warehouse_stocks',
  'inventory_transactions',
  'orders',
  'order_audits',
  'quotes',
  'dealers',
  'leads',
  'trips',
  'payroll_periods',
  'employees',
  'user_notification_states',
  'push_subscriptions',
  'token_blacklist',
  // leftover Telegram collections if any
  'telegram_contacts',
  'telegram_action_messages'
]

const KEEP = ['news', 'products', 'product_categories', 'warehouses', 'users']

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
  console.log('KEEP:', KEEP.join(', '))
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

  console.log('---')
  for (const name of KEEP) {
    const count = await db.collection(name).countDocuments({})
    console.log(`Kept ${name}: ${count} docs`)
  }

  await client.close()
  console.log('Done.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
