import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const USER_NOTIFICATION_STATE_COLLECTION_NAME = 'user_notification_states'
const MAX_READ_IDS = 200

const STATE_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  lastReadAt: Joi.date().default(() => new Date(0)),
  readIds: Joi.array().items(Joi.string().trim().max(80)).default([]),
  updatedAt: Joi.date().default(() => new Date())
})

const getOrCreate = async (userId) => {
  const collection = GET_DB().collection(USER_NOTIFICATION_STATE_COLLECTION_NAME)
  const existing = await collection.findOne({ userId: new ObjectId(userId) })

  if (existing) {
    return {
      ...existing,
      readIds: Array.isArray(existing.readIds) ? existing.readIds : []
    }
  }

  const validData = await STATE_SCHEMA.validateAsync({
    userId,
    lastReadAt: new Date(0),
    readIds: []
  })

  validData.userId = new ObjectId(validData.userId)

  await collection.insertOne(validData)

  return await collection.findOne({ userId: new ObjectId(userId) })
}

const markAllRead = async (userId) => {
  const now = new Date()

  await GET_DB()
    .collection(USER_NOTIFICATION_STATE_COLLECTION_NAME)
    .updateOne(
      { userId: new ObjectId(userId) },
      {
        $set: { lastReadAt: now, readIds: [], updatedAt: now },
        $setOnInsert: { userId: new ObjectId(userId) }
      },
      { upsert: true }
    )

  return { lastReadAt: now }
}

const markOneRead = async (userId, notificationId) => {
  const id = String(notificationId || '').trim()
  if (!id) return { readIds: [] }

  const collection = GET_DB().collection(USER_NOTIFICATION_STATE_COLLECTION_NAME)
  const state = await getOrCreate(userId)
  const existing = Array.isArray(state.readIds) ? state.readIds : []

  if (existing.includes(id)) {
    return { readIds: existing }
  }

  const readIds = [id, ...existing].slice(0, MAX_READ_IDS)
  const now = new Date()

  await collection.updateOne(
    { userId: new ObjectId(userId) },
    {
      $set: { readIds, updatedAt: now },
      $setOnInsert: {
        userId: new ObjectId(userId),
        lastReadAt: new Date(0)
      }
    },
    { upsert: true }
  )

  return { readIds }
}

export const userNotificationStateModel = {
  USER_NOTIFICATION_STATE_COLLECTION_NAME,
  getOrCreate,
  markAllRead,
  markOneRead
}
