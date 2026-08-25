import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const QUOTE_COLLECTION_NAME = 'quotes'

const optionalText = (max) => Joi.string().trim().allow('').max(max)

const QUOTE_LINE_SCHEMA = Joi.object({
  productId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  name: Joi.string().required().min(1).max(200).trim(),
  sku: optionalText(50).default(''),
  categoryId: optionalText(50).default(''),
  categoryName: optionalText(100).default(''),
  activeIngredient: optionalText(200).default(''),
  application: optionalText(2000).default(''),
  unitsPerCase: Joi.number().integer().min(1).default(1),
  costPrice: Joi.number().min(0).required(),
  quantity: Joi.number().integer().min(1).default(1),
  marginPercent: Joi.number().min(0).max(1000).required(),
  overrideUnitPrice: Joi.number().min(0).allow(null).default(null)
})

const QUOTE_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required().min(1).max(200).trim(),
  description: optionalText(2000).default(''),
  defaultMarginPercent: Joi.number().min(0).max(1000).required(),
  dealerIds: Joi.array()
    .items(Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE))
    .default([]),
  lines: Joi.array().items(QUOTE_LINE_SCHEMA).default([]),
  validFrom: Joi.date().allow(null).default(null),
  validUntil: Joi.date().allow(null).default(null),
  createdBy: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(null),
  _destroy: Joi.boolean().default(false)
})

const INVALID_UPDATE_FIELDS = ['_id', 'createdBy', 'createdAt']

const validateBeforeCreate = async (data) => {
  return await QUOTE_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  const validData = await validateBeforeCreate(data)
  validData.createdBy = new ObjectId(validData.createdBy)
  validData.dealerIds = (validData.dealerIds || []).map((id) => new ObjectId(id))
  return await GET_DB().collection(QUOTE_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB()
    .collection(QUOTE_COLLECTION_NAME)
    .findOne({ _id: new ObjectId(id), _destroy: false })
}

const findMany = async (filter = {}, options = {}) => {
  const {
    limit = 50,
    skip = 0,
    sort = { createdAt: -1 }
  } = options

  const findQuery = { _destroy: false, ...filter }

  const items = await GET_DB()
    .collection(QUOTE_COLLECTION_NAME)
    .find(findQuery)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .toArray()

  const total = await GET_DB()
    .collection(QUOTE_COLLECTION_NAME)
    .countDocuments(findQuery)

  return { items, total, limit, skip }
}

const update = async (id, updateData) => {
  const dataToUpdate = { ...updateData, updatedAt: new Date() }

  INVALID_UPDATE_FIELDS.forEach((field) => {
    delete dataToUpdate[field]
  })

  if (dataToUpdate.dealerIds) {
    dataToUpdate.dealerIds = dataToUpdate.dealerIds.map((d) =>
      typeof d === 'string' ? new ObjectId(d) : d
    )
  }

  return await GET_DB()
    .collection(QUOTE_COLLECTION_NAME)
    .updateOne({ _id: new ObjectId(id), _destroy: false }, { $set: dataToUpdate })
}

const deleteOne = async (id) => {
  return await GET_DB()
    .collection(QUOTE_COLLECTION_NAME)
    .updateOne(
      { _id: new ObjectId(id) },
      { $set: { _destroy: true, updatedAt: new Date() } }
    )
}

export const quoteModel = {
  QUOTE_COLLECTION_NAME,
  createNew,
  findOneById,
  findMany,
  update,
  deleteOne
}