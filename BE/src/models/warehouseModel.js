import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const WAREHOUSE_COLLECTION_NAME = 'warehouses'

const WAREHOUSE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
}

const optionalText = (max) => Joi.string().trim().allow('').max(max)

const WAREHOUSE_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required().min(2).max(150).trim(),
  code: Joi.string().required().min(2).max(50).trim(),
  address: optionalText(300).default(''),
  note: optionalText(500).default(''),
  status: Joi.string()
    .valid(WAREHOUSE_STATUS.ACTIVE, WAREHOUSE_STATUS.INACTIVE)
    .default(WAREHOUSE_STATUS.ACTIVE),
  createdBy: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await WAREHOUSE_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  const validData = await validateBeforeCreate(data)
  validData.createdBy = new ObjectId(validData.createdBy)
  return await GET_DB().collection(WAREHOUSE_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(WAREHOUSE_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    _destroy: false
  })
}

const findOneByCode = async (code, excludeId = null) => {
  const query = { code, _destroy: false }

  if (excludeId) {
    query._id = { $ne: new ObjectId(excludeId) }
  }

  return await GET_DB().collection(WAREHOUSE_COLLECTION_NAME).findOne(query)
}

const findMany = async (query = {}, options = {}) => {
  const {
    limit = 50,
    skip = 0,
    sort = { createdAt: -1 }
  } = options

  const findQuery = { _destroy: false, ...query }

  const items = await GET_DB()
    .collection(WAREHOUSE_COLLECTION_NAME)
    .find(findQuery)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .toArray()

  const total = await GET_DB()
    .collection(WAREHOUSE_COLLECTION_NAME)
    .countDocuments(findQuery)

  return { items, total, limit, skip }
}

const update = async (id, updateData) => {
  const dataToUpdate = {
    ...updateData,
    updatedAt: new Date()
  }

  return await GET_DB()
    .collection(WAREHOUSE_COLLECTION_NAME)
    .updateOne({ _id: new ObjectId(id), _destroy: false }, { $set: dataToUpdate })
}

const deleteOne = async (id) => {
  return await GET_DB()
    .collection(WAREHOUSE_COLLECTION_NAME)
    .updateOne(
      { _id: new ObjectId(id) },
      { $set: { _destroy: true, updatedAt: new Date() } }
    )
}

export const warehouseModel = {
  WAREHOUSE_COLLECTION_NAME,
  WAREHOUSE_STATUS,
  createNew,
  findOneById,
  findOneByCode,
  findMany,
  update,
  deleteOne
}
