import crypto from 'crypto'

const TTL_MS = 10 * 60 * 1000
const store = new Map()

const sweep = () => {
  const now = Date.now()
  for (const [token, entry] of store.entries()) {
    if (entry.expiresAt <= now) store.delete(token)
  }
}

export const createPendingAction = ({
  userId,
  toolName,
  args,
  preview,
  execute
}) => {
  sweep()
  const token = crypto.randomBytes(24).toString('hex')
  store.set(token, {
    userId: String(userId),
    toolName,
    args,
    preview,
    execute,
    createdAt: Date.now(),
    expiresAt: Date.now() + TTL_MS
  })
  return {
    token,
    toolName,
    preview,
    expiresAt: Date.now() + TTL_MS
  }
}

export const getPendingAction = (token, userId) => {
  sweep()
  const entry = store.get(token)
  if (!entry) return null
  if (String(entry.userId) !== String(userId)) return null
  if (entry.expiresAt <= Date.now()) {
    store.delete(token)
    return null
  }
  return entry
}

export const consumePendingAction = (token, userId) => {
  const entry = getPendingAction(token, userId)
  if (!entry) return null
  store.delete(token)
  return entry
}

export const cancelPendingAction = (token, userId) => {
  const entry = getPendingAction(token, userId)
  if (!entry) return false
  store.delete(token)
  return true
}
