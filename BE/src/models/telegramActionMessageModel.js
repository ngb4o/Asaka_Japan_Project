import { GET_DB } from '~/config/mongodb'

const COLLECTION = 'telegram_action_messages'

const ensureIndexes = async () => {
  const collection = GET_DB().collection(COLLECTION)
  await collection.createIndex({ entityType: 1, entityId: 1, kind: 1 }, { unique: true })
  await collection.createIndex({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 })
}

/**
 * Remember Telegram copies of an actionable notification so we can sync edits
 * across all staff chats when someone presses a button.
 */
const remember = async ({ entityType, entityId, kind, messages }) => {
  const now = new Date()
  const refs = (messages || [])
    .filter((item) => item?.chatId && item?.messageId != null)
    .map((item) => ({
      chatId: String(item.chatId),
      messageId: Number(item.messageId)
    }))

  if (!refs.length) return null

  await GET_DB()
    .collection(COLLECTION)
    .updateOne(
      {
        entityType: String(entityType),
        entityId: String(entityId),
        kind: String(kind)
      },
      {
        $set: {
          messages: refs,
          closed: false,
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: true }
    )

  return await findOne({ entityType, entityId, kind })
}

const findOne = async ({ entityType, entityId, kind }) => {
  return await GET_DB().collection(COLLECTION).findOne({
    entityType: String(entityType),
    entityId: String(entityId),
    kind: String(kind)
  })
}

const markClosed = async ({ entityType, entityId, kind }) => {
  await GET_DB()
    .collection(COLLECTION)
    .updateOne(
      {
        entityType: String(entityType),
        entityId: String(entityId),
        kind: String(kind)
      },
      { $set: { closed: true, updatedAt: new Date() } }
    )
}

export const telegramActionMessageModel = {
  COLLECTION,
  ensureIndexes,
  remember,
  findOne,
  markClosed
}
