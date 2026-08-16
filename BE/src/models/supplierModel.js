import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const SUPPLIER_COLLECTION_NAME = 'suppliers'

const SUPPLIER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
}

const optionalText = (max) => Joi.string().trim().allow('').max(max)

const SUPPLIER_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required().min(2).max(150).trim(),
  contactName: optionalText(100).default(''),
  phone: Joi.string().required().min(8).max(20).trim(),
  email: optionalText(150).default(''),
  address: optionalText(300).default(''),
  lat: Joi.number().min(-90).max(90).allow(null).default(null),
  lng: Joi.number().min(-180).max(180).allow(null).default(null),
  taxCode: optionalText(50).default(''),
  status: Joi.string()
    .valid(SUPPLIER_STATUS.ACTIVE, SUPPLIER_STATUS.INACTIVE)
    .default(SUPPLIER_STATUS.ACTIVE),
  note: optionalText(1000).default(''),
  createdBy: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await SUPPLIER_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  const validData = await validateBeforeCreate(data)
  validData.createdBy = new ObjectId(validData.createdBy)
  return await GET_DB().collection(SUPPLIER_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(SUPPLIER_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    _destroy: false
  })
}

const findMany = async (query = {}, options = {}) => {
  const {
    limit = 50,
    skip = 0,
    sort = { createdAt: -1 }
  } = options

  const findQuery = { _destroy: false, ...query }

  const items = await GET_DB()
    .collection(SUPPLIER_COLLECTION_NAME)
    .find(findQuery)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .toArray()

  const total = await GET_DB()
    .collection(SUPPLIER_COLLECTION_NAME)
    .countDocuments(findQuery)

  return { items, total, limit, skip }
}

const update = async (id, updateData) => {
  return await GET_DB()
    .collection(SUPPLIER_COLLECTION_NAME)
    .updateOne(
      { _id: new ObjectId(id), _destroy: false },
      { $set: { ...updateData, updatedAt: new Date() } }
    )
}

const deleteOne = async (id) => {
  return await GET_DB()
    .collection(SUPPLIER_COLLECTION_NAME)
    .updateOne(
      { _id: new ObjectId(id) },
      { $set: { _destroy: true, updatedAt: new Date() } }
    )
}

export const supplierModel = {
  SUPPLIER_COLLECTION_NAME,
  SUPPLIER_STATUS,
  createNew,
  findOneById,
  findMany,
  update,
  deleteOne
}
