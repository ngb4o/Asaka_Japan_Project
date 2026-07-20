import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const USER_NOTIFICATION_STATE_COLLECTION_NAME = 'user_notification_states'

const STATE_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  lastReadAt: Joi.date().default(() => new Date(0)),
  updatedAt: Joi.date().default(() => new Date())
})

const getOrCreate = async (userId) => {
  const collection = GET_DB().collection(USER_NOTIFICATION_STATE_COLLECTION_NAME)
  const existing = await collection.findOne({ userId: new ObjectId(userId) })

  if (existing) return existing

  const validData = await STATE_SCHEMA.validateAsync({
    userId,
    lastReadAt: new Date(0)
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
        $set: { lastReadAt: now, updatedAt: now },
        $setOnInsert: { userId: new ObjectId(userId) }
      },
      { upsert: true }
    )

  return { lastReadAt: now }
}

export const userNotificationStateModel = {
  USER_NOTIFICATION_STATE_COLLECTION_NAME,
  getOrCreate,
  markAllRead
}
