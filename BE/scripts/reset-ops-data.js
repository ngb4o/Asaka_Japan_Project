/**
 * Reset operational data and seed the default admin account.
 * Usage (from BE/): node scripts/reset-ops-data.js
 *
 * Clears: dealers, leads, orders, quotes, warehouse stocks,
 * inventory transactions, users, token blacklist, notification states.
 * Creates: username `admin` / password `123123` (role admin).
 */
require('dotenv').config()
const { MongoClient } = require('mongodb')
const bcrypt = require('bcryptjs')

const COLLECTIONS = [
  'dealers',
  'leads',
  'orders',
  'quotes',
  'warehouse_stocks',
  'inventory_transactions',
  'users',
  'token_blacklist',
  'user_notification_states'
]

async function main() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.DATABASE_NAME

  if (!uri || !dbName) {
    throw new Error('Missing MONGODB_URI or DATABASE_NAME in .env')
  }

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)

  for (const name of COLLECTIONS) {
    const result = await db.collection(name).deleteMany({})
    console.log(`Cleared ${name}: ${result.deletedCount}`)
  }

  const passwordHash = await bcrypt.hash('123123', 10)
  await db.collection('users').insertOne({
    email: 'admin@asaka.local',
    username: 'admin',
    password: passwordHash,
    avatar: null,
    role: 'admin',
    roles: ['admin'],
    createdAt: new Date(),
    updatedAt: null,
    _destroy: false
  })

  console.log('Seeded admin account: admin@asaka.local / 123123')
  await client.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
