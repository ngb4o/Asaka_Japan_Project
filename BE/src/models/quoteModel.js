import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const QUOTE_COLLECTION_NAME = 'quotes'

const QUOTE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
}

const optionalText = (max) => Joi.string().trim().allow('').max(max)

const QUOTE_ITEM_SCHEMA = Joi.object({
  productId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  productName: Joi.string().required().trim().max(200),
  quantity: Joi.number().integer().min(1).required(),
  unitPrice: Joi.number().min(0).required(),
  lineTotal: Joi.number().min(0).required()
})

const QUOTE_COLLECTION_SCHEMA = Joi.object({
  code: Joi.string().required().trim().max(50),
  dealerId: Joi.string()
    .allow(null, '')
    .pattern(OBJECT_ID_RULE)
    .message(OBJECT_ID_RULE_MESSAGE)
    .default(null),
  customerName: optionalText(150).default(''),
  customerPhone: optionalText(20).default(''),
  customerEmail: optionalText(150).default(''),
  items: Joi.array().items(QUOTE_ITEM_SCHEMA).min(1).required(),
  subtotal: Joi.number().min(0).required(),
  discount: Joi.number().min(0).default(0),
  total: Joi.number().min(0).required(),
  status: Joi.string()
    .valid(
      QUOTE_STATUS.DRAFT,
      QUOTE_STATUS.SENT,
      QUOTE_STATUS.ACCEPTED,
      QUOTE_STATUS.REJECTED,
      QUOTE_STATUS.EXPIRED
    )
    .default(QUOTE_STATUS.DRAFT),
  note: optionalText(1000).default(''),
  validUntil: Joi.date().allow(null).default(null),
  orderId: Joi.string()
    .allow(null, '')
    .pattern(OBJECT_ID_RULE)
    .message(OBJECT_ID_RULE_MESSAGE)
    .default(null),
  createdBy: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await QUOTE_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const normalizeRefs = (data) => {
  const next = { ...data }

  if (next.dealerId) {
    next.dealerId = new ObjectId(next.dealerId)
  } else {
    next.dealerId = null
  }

  if (next.orderId) {
    next.orderId = new ObjectId(next.orderId)
  } else {
    next.orderId = null
  }

  next.createdBy = new ObjectId(next.createdBy)
  next.items = next.items.map((item) => ({
    ...item,
    productId: new ObjectId(item.productId)
  }))

  return next
}

const createNew = async (data) => {
  const validData = await validateBeforeCreate(data)
  return await GET_DB()
    .collection(QUOTE_COLLECTION_NAME)
    .insertOne(normalizeRefs(validData))
}

const findOneById = async (id) => {
  return await GET_DB().collection(QUOTE_COLLECTION_NAME).findOne({
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
  const dataToUpdate = {
    ...updateData,
    updatedAt: new Date()
  }

  if (dataToUpdate.dealerId) {
    dataToUpdate.dealerId = new ObjectId(dataToUpdate.dealerId)
  }

  if (dataToUpdate.orderId) {
    dataToUpdate.orderId = new ObjectId(dataToUpdate.orderId)
  }

  if (Array.isArray(dataToUpdate.items)) {
    dataToUpdate.items = dataToUpdate.items.map((item) => ({
      ...item,
      productId: new ObjectId(item.productId)
    }))
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

const countByStatus = async (status) => {
  return await GET_DB().collection(QUOTE_COLLECTION_NAME).countDocuments({
    _destroy: false,
    status
  })
}

export const quoteModel = {
  QUOTE_COLLECTION_NAME,
  QUOTE_STATUS,
  createNew,
  findOneById,
  findMany,
  update,
  deleteOne,
  countByStatus
}
