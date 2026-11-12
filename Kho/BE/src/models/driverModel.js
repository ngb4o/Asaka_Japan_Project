import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const DRIVER_COLLECTION_NAME = 'drivers'

const DRIVER_SCHEMA = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  phone: Joi.string().trim().allow('').max(20).default(''),
  plate: Joi.string().trim().allow('').max(20).default(''),
  mooc: Joi.string().trim().allow('').max(20).default(''),
  note: Joi.string().trim().allow('').max(300).default(''),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await DRIVER_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  const validData = await validateBeforeCreate(data)
  return await GET_DB().collection(DRIVER_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(DRIVER_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    _destroy: false
  })
}

const findMany = async (query = {}, options = {}) => {
  const { limit = 50, skip = 0, sort = { name: 1 } } = options
  const collection = GET_DB().collection(DRIVER_COLLECTION_NAME)
  const items = await collection.find(query).sort(sort).skip(skip).limit(limit).toArray()
  const total = await collection.countDocuments(query)
  return { items, total, limit, skip }
}

const unwrapFindOneAndUpdate = (result) => {
  if (result == null) return null
  if (Object.prototype.hasOwnProperty.call(result, 'value') && !Object.prototype.hasOwnProperty.call(result, '_id')) {
    return result.value ?? null
  }
  return result
}

const update = async (id, updateData) => {
  const result = await GET_DB().collection(DRIVER_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(id), _destroy: false },
    { $set: { ...updateData, updatedAt: new Date() } },
    { returnDocument: 'after' }
  )
  return unwrapFindOneAndUpdate(result)
}

const softDelete = async (id) => {
  return await GET_DB().collection(DRIVER_COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id), _destroy: false },
    { $set: { _destroy: true, updatedAt: new Date() } }
  )
}

const ensureIndexes = async () => {
  await GET_DB().collection(DRIVER_COLLECTION_NAME).createIndex({ name: 1 })
}

export const driverModel = {
  DRIVER_COLLECTION_NAME,
  createNew,
  findOneById,
  findMany,
  update,
  softDelete,
  ensureIndexes
}
