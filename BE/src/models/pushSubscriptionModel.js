import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

const PUSH_SUBSCRIPTION_COLLECTION_NAME = 'push_subscriptions'

const SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  endpoint: Joi.string().required().uri().max(2048),
  keys: Joi.object({
    p256dh: Joi.string().required().max(512),
    auth: Joi.string().required().max(512)
  }).required(),
  userAgent: Joi.string().trim().allow('').max(500).default(''),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(() => new Date())
})

const ensureIndexes = async () => {
  const collection = GET_DB().collection(PUSH_SUBSCRIPTION_COLLECTION_NAME)
  await collection.createIndex({ endpoint: 1 }, { unique: true })
  await collection.createIndex({ userId: 1 })
}

const upsert = async (userId, subscription, userAgent = '') => {
  const endpoint = subscription?.endpoint
  const keys = subscription?.keys

  const validData = await SCHEMA.validateAsync(
    {
      userId,
      endpoint,
      keys: {
        p256dh: keys?.p256dh,
        auth: keys?.auth
      },
      userAgent
    },
    { abortEarly: false }
  )

  const now = new Date()
  const collection = GET_DB().collection(PUSH_SUBSCRIPTION_COLLECTION_NAME)

  await collection.updateOne(
    { endpoint: validData.endpoint },
    {
      $set: {
        userId: new ObjectId(validData.userId),
        keys: validData.keys,
        userAgent: validData.userAgent || '',
        updatedAt: now
      },
      $setOnInsert: {
        endpoint: validData.endpoint,
        createdAt: now
      }
    },
    { upsert: true }
  )

  return { endpoint: validData.endpoint }
}

const removeByEndpoint = async (userId, endpoint) => {
  const result = await GET_DB()
    .collection(PUSH_SUBSCRIPTION_COLLECTION_NAME)
    .deleteOne({
      userId: new ObjectId(userId),
      endpoint: String(endpoint || '')
    })

  return { deleted: result.deletedCount > 0 }
}

const removeByEndpointOnly = async (endpoint) => {
  await GET_DB()
    .collection(PUSH_SUBSCRIPTION_COLLECTION_NAME)
    .deleteOne({ endpoint: String(endpoint || '') })
}

const listAll = async () => {
  return GET_DB()
    .collection(PUSH_SUBSCRIPTION_COLLECTION_NAME)
    .find({})
    .toArray()
}

const listByUser = async (userId) => {
  return GET_DB()
    .collection(PUSH_SUBSCRIPTION_COLLECTION_NAME)
    .find({ userId: new ObjectId(userId) })
    .toArray()
}

const countByUser = async (userId) => {
  return GET_DB()
    .collection(PUSH_SUBSCRIPTION_COLLECTION_NAME)
    .countDocuments({ userId: new ObjectId(userId) })
}

export const pushSubscriptionModel = {
  PUSH_SUBSCRIPTION_COLLECTION_NAME,
  ensureIndexes,
  upsert,
  removeByEndpoint,
  removeByEndpointOnly,
  listAll,
  listByUser,
  countByUser
}
