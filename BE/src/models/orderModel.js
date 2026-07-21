import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const ORDER_COLLECTION_NAME = 'orders'

const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  DELIVERING: 'delivering',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
}

const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid'
}

const optionalText = (max) => Joi.string().trim().allow('').max(max)

const ORDER_ITEM_SCHEMA = Joi.object({
  productId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  productName: Joi.string().required().trim().max(200),
  quantity: Joi.number().integer().min(1).required(),
  unitPrice: Joi.number().min(0).required(),
  lineTotal: Joi.number().min(0).required()
})

const ORDER_COLLECTION_SCHEMA = Joi.object({
  code: Joi.string().required().trim().max(50),
  dealerId: Joi.string()
    .allow(null, '')
    .pattern(OBJECT_ID_RULE)
    .message(OBJECT_ID_RULE_MESSAGE)
    .default(null),
  quoteId: Joi.string()
    .allow(null, '')
    .pattern(OBJECT_ID_RULE)
    .message(OBJECT_ID_RULE_MESSAGE)
    .default(null),
  warehouseId: Joi.string()
    .allow(null, '')
    .pattern(OBJECT_ID_RULE)
    .message(OBJECT_ID_RULE_MESSAGE)
    .default(null),
  customerName: optionalText(150).default(''),
  customerPhone: optionalText(20).default(''),
  customerEmail: optionalText(150).default(''),
  items: Joi.array().items(ORDER_ITEM_SCHEMA).min(1).required(),
  subtotal: Joi.number().min(0).required(),
  discount: Joi.number().min(0).default(0),
  total: Joi.number().min(0).required(),
  status: Joi.string()
    .valid(
      ORDER_STATUS.PENDING,
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.DELIVERING,
      ORDER_STATUS.COMPLETED,
      ORDER_STATUS.CANCELLED
    )
    .default(ORDER_STATUS.PENDING),
  note: optionalText(1000).default(''),
  inventoryExported: Joi.boolean().default(false),
  paymentStatus: Joi.string()
    .valid(PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.PARTIAL, PAYMENT_STATUS.PAID)
    .default(PAYMENT_STATUS.UNPAID),
  paidAmount: Joi.number().min(0).default(0),
  paymentNote: optionalText(1000).default(''),
  shippingAddress: optionalText(500).default(''),
  shippingContactName: optionalText(150).default(''),
  shippingPhone: optionalText(20).default(''),
  carrier: optionalText(150).default(''),
  trackingCode: optionalText(100).default(''),
  shippingDate: Joi.date().allow(null).default(null),
  deliveredAt: Joi.date().allow(null).default(null),
  shippingFee: Joi.number().min(0).default(0),
  shippingNote: optionalText(1000).default(''),
  createdBy: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await ORDER_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const normalizeRefs = (data) => {
  const next = { ...data }

  next.dealerId = next.dealerId ? new ObjectId(next.dealerId) : null
  next.quoteId = next.quoteId ? new ObjectId(next.quoteId) : null
  next.warehouseId = next.warehouseId ? new ObjectId(next.warehouseId) : null
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
    .collection(ORDER_COLLECTION_NAME)
    .insertOne(normalizeRefs(validData))
}

const findOneById = async (id) => {
  return await GET_DB().collection(ORDER_COLLECTION_NAME).findOne({
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
    .collection(ORDER_COLLECTION_NAME)
    .find(findQuery)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .toArray()

  const total = await GET_DB()
    .collection(ORDER_COLLECTION_NAME)
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

  if (dataToUpdate.quoteId) {
    dataToUpdate.quoteId = new ObjectId(dataToUpdate.quoteId)
  }

  if (dataToUpdate.warehouseId) {
    dataToUpdate.warehouseId = new ObjectId(dataToUpdate.warehouseId)
  }

  if (Array.isArray(dataToUpdate.items)) {
    dataToUpdate.items = dataToUpdate.items.map((item) => ({
      ...item,
      productId: new ObjectId(item.productId)
    }))
  }

  return await GET_DB()
    .collection(ORDER_COLLECTION_NAME)
    .updateOne({ _id: new ObjectId(id), _destroy: false }, { $set: dataToUpdate })
}

const deleteOne = async (id) => {
  return await GET_DB()
    .collection(ORDER_COLLECTION_NAME)
    .updateOne(
      { _id: new ObjectId(id) },
      { $set: { _destroy: true, updatedAt: new Date() } }
    )
}

const countByStatus = async (status) => {
  return await GET_DB().collection(ORDER_COLLECTION_NAME).countDocuments({
    _destroy: false,
    status
  })
}

const sumCompletedTotal = async () => {
  const result = await GET_DB()
    .collection(ORDER_COLLECTION_NAME)
    .aggregate([
      {
        $match: {
          _destroy: false,
          status: ORDER_STATUS.COMPLETED
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      }
    ])
    .toArray()

  return {
    revenue: result[0]?.total || 0,
    count: result[0]?.count || 0
  }
}

export const orderModel = {
  ORDER_COLLECTION_NAME,
  ORDER_STATUS,
  PAYMENT_STATUS,
  createNew,
  findOneById,
  findMany,
  update,
  deleteOne,
  countByStatus,
  sumCompletedTotal
}
