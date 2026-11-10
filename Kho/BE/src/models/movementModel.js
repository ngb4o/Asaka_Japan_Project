import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const MOVEMENT_COLLECTION_NAME = 'movements'

const MOVEMENT_TYPES = ['in', 'out']

const MOVEMENT_SCHEMA = Joi.object({
  itemId: Joi.any().required(),
  itemName: Joi.string().trim().min(1).max(200).required(),
  type: Joi.string().valid(...MOVEMENT_TYPES).required(),
  quantity: Joi.number().greater(0).required(),
  note: Joi.string().trim().allow('').max(300).default(''),
  createdBy: Joi.string().trim().allow('').max(80).default(''),
  balanceAfter: Joi.number().min(0).required(),
  createdAt: Joi.date().default(() => new Date())
})

const createNew = async (data, session = null) => {
  const validData = await MOVEMENT_SCHEMA.validateAsync(data, { abortEarly: false })
  validData.itemId = new ObjectId(validData.itemId)
  const options = session ? { session } : {}

  return await GET_DB().collection(MOVEMENT_COLLECTION_NAME).insertOne(validData, options)
}

const findMany = async (query = {}, options = {}) => {
  const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options
  const collection = GET_DB().collection(MOVEMENT_COLLECTION_NAME)
  const items = await collection.find(query).sort(sort).skip(skip).limit(limit).toArray()
  const total = await collection.countDocuments(query)

  return { items, total, limit, skip }
}

const ensureIndexes = async () => {
  const collection = GET_DB().collection(MOVEMENT_COLLECTION_NAME)
  await collection.createIndex({ createdAt: -1 })
  await collection.createIndex({ itemId: 1, createdAt: -1 })
}

export const movementModel = {
  MOVEMENT_COLLECTION_NAME,
  MOVEMENT_TYPES,
  createNew,
  findMany,
  ensureIndexes
}
