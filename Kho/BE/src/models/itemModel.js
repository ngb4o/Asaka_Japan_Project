import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const ITEM_COLLECTION_NAME = 'items'

const ITEM_SCHEMA = Joi.object({
  name: Joi.string().required().min(2).max(200).trim(),
  image: Joi.string().trim().allow('').max(500).default(''),
  quantity: Joi.number().min(0).required(),
  column: Joi.number().integer().min(1).max(9999).allow(null).default(null),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await ITEM_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  const validData = await validateBeforeCreate(data)
  return await GET_DB().collection(ITEM_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(ITEM_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    _destroy: false
  })
}

const findMany = async (query = {}, options = {}) => {
  const { limit = 200, skip = 0, sort = { column: 1, name: 1 } } = options

  const collection = GET_DB().collection(ITEM_COLLECTION_NAME)
  const items = await collection.find(query).sort(sort).skip(skip).limit(limit).toArray()
  const total = await collection.countDocuments(query)

  return { items, total, limit, skip }
}

const unwrapFindOneAndUpdate = (result) => {
  if (result == null) return null
  if (Object.prototype.hasOwnProperty.call(result, 'value') && !('name' in result)) {
    return result.value ?? null
  }
  return result
}

const update = async (id, updateData) => {
  const result = await GET_DB().collection(ITEM_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(id), _destroy: false },
    { $set: { ...updateData, updatedAt: new Date() } },
    { returnDocument: 'after' }
  )

  return unwrapFindOneAndUpdate(result)
}

const softDelete = async (id) => {
  return await GET_DB().collection(ITEM_COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id), _destroy: false },
    { $set: { _destroy: true, updatedAt: new Date() } }
  )
}

const summarize = async () => {
  const rows = await GET_DB().collection(ITEM_COLLECTION_NAME).aggregate([
    { $match: { _destroy: false } },
    {
      $group: {
        _id: null,
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        columns: { $addToSet: '$column' }
      }
    }
  ]).toArray()

  const summary = rows[0] || { totalItems: 0, totalQuantity: 0, columns: [] }

  return {
    totalItems: summary.totalItems,
    totalQuantity: summary.totalQuantity,
    columns: summary.columns.filter((column) => Number.isFinite(column)).sort((a, b) => a - b)
  }
}

const ensureIndexes = async () => {
  await GET_DB().collection(ITEM_COLLECTION_NAME).createIndex({ column: 1, name: 1 })
}

export const itemModel = {
  ITEM_COLLECTION_NAME,
  createNew,
  findOneById,
  findMany,
  update,
  softDelete,
  summarize,
  ensureIndexes
}
