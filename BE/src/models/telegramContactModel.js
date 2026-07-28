import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'
import { normalizePhone } from '~/utils/phone'

const TELEGRAM_CONTACT_COLLECTION_NAME = 'telegram_contacts'

const TELEGRAM_CONTACT_ROLE = {
  CUSTOMER: 'customer',
  DEALER: 'dealer',
  STAFF: 'staff'
}

const SCHEMA = Joi.object({
  phone: Joi.string().trim().allow('').max(20).default(''),
  chatId: Joi.string().required().trim().max(64),
  displayName: Joi.string().trim().allow('').max(150).default(''),
  username: Joi.string().trim().allow('').max(100).default(''),
  role: Joi.string()
    .valid(...Object.values(TELEGRAM_CONTACT_ROLE))
    .default(TELEGRAM_CONTACT_ROLE.CUSTOMER),
  lastInteractedAt: Joi.date().allow(null).default(null),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(null)
})

const ensureIndexes = async () => {
  const collection = GET_DB().collection(TELEGRAM_CONTACT_COLLECTION_NAME)
  await collection.createIndex({ chatId: 1 }, { unique: true })
  await collection.createIndex({ phone: 1 })
  await collection.createIndex({ role: 1 })
}

const upsertByChatId = async ({
  chatId,
  phone = '',
  displayName = '',
  username = '',
  role = TELEGRAM_CONTACT_ROLE.CUSTOMER,
  lastInteractedAt = null
}) => {
  const normalizedPhone = normalizePhone(phone)
  const now = new Date()
  const payload = await SCHEMA.validateAsync(
    {
      phone: normalizedPhone,
      chatId: String(chatId).trim(),
      displayName: displayName || '',
      username: username || '',
      role,
      lastInteractedAt: lastInteractedAt || now,
      updatedAt: now
    },
    { abortEarly: false }
  )

  await GET_DB()
    .collection(TELEGRAM_CONTACT_COLLECTION_NAME)
    .updateOne(
      { chatId: payload.chatId },
      {
        $set: {
          phone: payload.phone,
          displayName: payload.displayName,
          username: payload.username,
          role: payload.role,
          lastInteractedAt: payload.lastInteractedAt,
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    )

  return await findByChatId(payload.chatId)
}

const findByChatId = async (chatId) => {
  return await GET_DB()
    .collection(TELEGRAM_CONTACT_COLLECTION_NAME)
    .findOne({ chatId: String(chatId) })
}

const findByPhone = async (phone) => {
  const normalized = normalizePhone(phone)
  if (!normalized) return null

  return await GET_DB()
    .collection(TELEGRAM_CONTACT_COLLECTION_NAME)
    .findOne({ phone: normalized })
}

const findStaff = async () => {
  return await GET_DB()
    .collection(TELEGRAM_CONTACT_COLLECTION_NAME)
    .find({ role: TELEGRAM_CONTACT_ROLE.STAFF })
    .toArray()
}

const list = async ({ limit = 100, skip = 0, role = null } = {}) => {
  const collection = GET_DB().collection(TELEGRAM_CONTACT_COLLECTION_NAME)
  const findQuery = role ? { role } : {}
  const [items, total] = await Promise.all([
    collection.find(findQuery).sort({ updatedAt: -1 }).limit(limit).skip(skip).toArray(),
    collection.countDocuments(findQuery)
  ])

  return { items, total }
}

const deleteByChatId = async (chatId) => {
  const result = await GET_DB()
    .collection(TELEGRAM_CONTACT_COLLECTION_NAME)
    .deleteOne({ chatId: String(chatId) })

  return result.deletedCount > 0
}

const touchInteraction = async (chatId) => {
  await GET_DB()
    .collection(TELEGRAM_CONTACT_COLLECTION_NAME)
    .updateOne(
      { chatId: String(chatId) },
      { $set: { lastInteractedAt: new Date(), updatedAt: new Date() } }
    )
}

export const telegramContactModel = {
  TELEGRAM_CONTACT_COLLECTION_NAME,
  TELEGRAM_CONTACT_ROLE,
  ensureIndexes,
  upsertByChatId,
  findByChatId,
  findByPhone,
  findStaff,
  list,
  deleteByChatId,
  touchInteraction
}
