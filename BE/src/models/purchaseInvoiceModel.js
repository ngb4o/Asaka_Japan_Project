import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const PURCHASE_INVOICE_COLLECTION_NAME = 'purchase_invoices'

const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid'
}

const INVOICE_STATUS = {
  OPEN: 'open',
  CANCELLED: 'cancelled'
}

const LINE_ITEM_SCHEMA = Joi.object({
  productId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  productName: Joi.string().trim().allow('').max(200).default(''),
  quantity: Joi.number().required().min(0),
  unitType: Joi.string().valid('chai', 'thung').default('chai'),
  quantityBase: Joi.number().min(0).default(0),
  unitCost: Joi.number().min(0).default(0),
  totalCost: Joi.number().min(0).default(0),
  transactionId: Joi.string()
    .allow(null, '')
    .pattern(OBJECT_ID_RULE)
    .message(OBJECT_ID_RULE_MESSAGE)
    .default(null)
})

const PURCHASE_INVOICE_SCHEMA = Joi.object({
  code: Joi.string().required().trim().max(40),
  supplierId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  warehouseId: Joi.string()
    .allow(null, '')
    .pattern(OBJECT_ID_RULE)
    .message(OBJECT_ID_RULE_MESSAGE)
    .default(null),
  invoiceDate: Joi.date().default(() => new Date()),
  dueDate: Joi.date().allow(null).default(null),
  items: Joi.array().items(LINE_ITEM_SCHEMA).default([]),
  total: Joi.number().min(0).required(),
  paidAmount: Joi.number().min(0).default(0),
  paymentStatus: Joi.string()
    .valid(PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.PARTIAL, PAYMENT_STATUS.PAID)
    .default(PAYMENT_STATUS.UNPAID),
  status: Joi.string()
    .valid(INVOICE_STATUS.OPEN, INVOICE_STATUS.CANCELLED)
    .default(INVOICE_STATUS.OPEN),
  note: Joi.string().trim().allow('').max(1000).default(''),
  createdBy: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await PURCHASE_INVOICE_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data, session = null) => {
  const validData = await validateBeforeCreate(data)
  validData.supplierId = new ObjectId(validData.supplierId)
  if (validData.warehouseId) {
    validData.warehouseId = new ObjectId(validData.warehouseId)
  } else {
    validData.warehouseId = null
  }
  validData.createdBy = new ObjectId(validData.createdBy)
  validData.items = (validData.items || []).map((item) => ({
    ...item,
    productId: new ObjectId(item.productId),
    transactionId: item.transactionId ? new ObjectId(item.transactionId) : null
  }))

  const options = session ? { session } : {}
  return await GET_DB()
    .collection(PURCHASE_INVOICE_COLLECTION_NAME)
    .insertOne(validData, options)
}

const findOneById = async (id) => {
  return await GET_DB().collection(PURCHASE_INVOICE_COLLECTION_NAME).findOne({
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
    .collection(PURCHASE_INVOICE_COLLECTION_NAME)
    .find(findQuery)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .toArray()

  const total = await GET_DB()
    .collection(PURCHASE_INVOICE_COLLECTION_NAME)
    .countDocuments(findQuery)

  return { items, total, limit, skip }
}

const update = async (id, updateData, session = null) => {
  const options = session ? { session } : {}
  return await GET_DB()
    .collection(PURCHASE_INVOICE_COLLECTION_NAME)
    .updateOne(
      { _id: new ObjectId(id), _destroy: false },
      { $set: { ...updateData, updatedAt: new Date() } },
      options
    )
}

export const purchaseInvoiceModel = {
  PURCHASE_INVOICE_COLLECTION_NAME,
  PAYMENT_STATUS,
  INVOICE_STATUS,
  createNew,
  findOneById,
  findMany,
  update
}
