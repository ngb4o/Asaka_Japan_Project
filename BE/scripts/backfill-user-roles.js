/**
 * Backfill users.roles from legacy users.role
 * Usage: node -r esm OR via babel-node from BE package scripts
 *
 *   cd BE && npx babel-node ./scripts/backfill-user-roles.js
 */
import { GET_DB, CONNECT_DB, CLOSE_DB } from '~/config/mongodb'

async function main() {
  await CONNECT_DB()
  const col = GET_DB().collection('users')
  const users = await col.find({}).toArray()
  let updated = 0

  for (const user of users) {
    const hasRoles = Array.isArray(user.roles) && user.roles.length > 0
    if (hasRoles) {
      const primary = user.roles[0]
      if (user.role !== primary) {
        await col.updateOne(
          { _id: user._id },
          { $set: { role: primary, updatedAt: new Date() } }
        )
        updated += 1
      }
      continue
    }

    const role = user.role || 'admin'
    await col.updateOne(
      { _id: user._id },
      {
        $set: {
          roles: [role],
          role,
          updatedAt: new Date()
        }
      }
    )
    updated += 1
  }

  console.log(`Backfill done. Updated ${updated}/${users.length} users.`)
  await CLOSE_DB()
}

main().catch(async (error) => {
  console.error(error)
  try {
    await CLOSE_DB()
  } catch {
    /* ignore */
  }
  process.exit(1)
})
