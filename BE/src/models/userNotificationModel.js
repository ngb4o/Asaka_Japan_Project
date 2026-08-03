import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const USER_NOTIFICATION_COLLECTION_NAME = 'notifications'

const NOTIFICATION_TYPES = {
  LEAD: 'lead',
  DEALER_LEAD: 'dealer_lead',
  DEALER: 'dealer',
  ORDER: 'order',
  STOCK: 'stock',
  TRIP: 'trip',
  PAYMENT: 'payment'
}

const SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  type: Joi.string()
    .valid(...Object.values(NOTIFICATION_TYPES))
    .required(),
  title: Joi.string().required().trim().max(200),
  body: Joi.string().allow('').trim().max(1000).default(''),
  href: Joi.string().allow('').trim().max(500).default('/dashboard'),
  tag: Joi.string().allow('').trim().max(120).default(''),
  entityType: Joi.string().allow('', null).trim().max(40).default(null),
  entityId: Joi.string().allow('', null).trim().max(40).default(null),
  createdAt: Joi.date().default(() => new Date()),
  readAt: Joi.date().allow(null).default(null),
  _destroy: Joi.boolean().default(false)
})

let indexesReady = false

const ensureIndexes = async () => {
  if (indexesReady) return
  const collection = GET_DB().collection(USER_NOTIFICATION_COLLECTION_NAME)
  await collection.createIndex({ userId: 1, createdAt: -1 })
  await collection.createIndex({ userId: 1, readAt: 1, createdAt: -1 })
  indexesReady = true
}

const createManyForUsers = async (userIds, payload) => {
  await ensureIndexes()
  const unique = [...new Set((userIds || []).map((id) => String(id)).filter(Boolean))]
  if (!unique.length) return []

  const now = new Date()
  const docs = []

  for (const userId of unique) {
    const valid = await SCHEMA.validateAsync(
      {
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body || '',
        href: payload.href || '/dashboard',
        tag: payload.tag || '',
        entityType: payload.entityType || null,
        entityId: payload.entityId || null,
        createdAt: now,
        readAt: null,
        _destroy: false
      },
      { abortEarly: false }
    )
    docs.push({
      ...valid,
      userId: new ObjectId(valid.userId)
    })
  }

  if (!docs.length) return []

  const result = await GET_DB()
    .collection(USER_NOTIFICATION_COLLECTION_NAME)
    .insertMany(docs)

  return docs.map((doc, index) => ({
    ...doc,
    _id: result.insertedIds[index]
  }))
}

const findByUser = async (userId, { limit = 30 } = {}) => {
  await ensureIndexes()
  return GET_DB()
    .collection(USER_NOTIFICATION_COLLECTION_NAME)
    .find({
      userId: new ObjectId(userId),
      _destroy: { $ne: true }
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()
}

const markOneRead = async (userId, notificationId) => {
  await ensureIndexes()
  const id = String(notificationId || '').trim()
  if (!ObjectId.isValid(id)) return { matched: false }

  const result = await GET_DB()
    .collection(USER_NOTIFICATION_COLLECTION_NAME)
    .updateOne(
      {
        _id: new ObjectId(id),
        userId: new ObjectId(userId),
        _destroy: { $ne: true },
        readAt: null
      },
      { $set: { readAt: new Date() } }
    )

  return { matched: result.matchedCount > 0, modified: result.modifiedCount > 0 }
}

const markAllRead = async (userId) => {
  await ensureIndexes()
  const now = new Date()
  const result = await GET_DB()
    .collection(USER_NOTIFICATION_COLLECTION_NAME)
    .updateMany(
      {
        userId: new ObjectId(userId),
        _destroy: { $ne: true },
        readAt: null
      },
      { $set: { readAt: now } }
    )

  return { modified: result.modifiedCount, lastReadAt: now }
}

const countUnreadByType = async (userId) => {
  await ensureIndexes()
  const rows = await GET_DB()
    .collection(USER_NOTIFICATION_COLLECTION_NAME)
    .aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          _destroy: { $ne: true },
          readAt: null
        }
      },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ])
    .toArray()

  return Object.fromEntries(rows.map((row) => [row._id, row.count]))
}

export const userNotificationModel = {
  USER_NOTIFICATION_COLLECTION_NAME,
  NOTIFICATION_TYPES,
  ensureIndexes,
  createManyForUsers,
  findByUser,
  markOneRead,
  markAllRead,
  countUnreadByType
}
