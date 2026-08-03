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
  productImage: optionalText(500).default(''),
  quantity: Joi.number().integer().min(1).required(),
  unitType: Joi.string().valid('chai', 'thung').default('chai'),
  quantityBase: Joi.number().integer().min(1).optional(),
  unitPrice: Joi.number().min(0).required(),
  lineTotal: Joi.number().min(0).required(),
  /** Snapshot giá vốn / đơn vị bán (chai hoặc thùng) lúc tạo/sửa dòng */
  unitCost: Joi.number().min(0).default(0),
  lineCost: Joi.number().min(0).default(0)
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
  tripId: Joi.string()
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
  /** Tổng giá vốn snapshot của các dòng */
  costTotal: Joi.number().min(0).default(0),
  /** Lãi gộp = total − costTotal (đơn hủy = 0) */
  grossProfit: Joi.number().default(0),
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
  /** Khóa tạm khi đang xuất kho — chặn double-click / race */
  inventoryExportClaimedAt: Joi.date().allow(null).default(null),
  paymentStatus: Joi.string()
    .valid(PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.PARTIAL, PAYMENT_STATUS.PAID)
    .default(PAYMENT_STATUS.UNPAID),
  paidAmount: Joi.number().min(0).default(0),
  paymentNote: optionalText(1000).default(''),
  shippingAddress: optionalText(500).default(''),
  shippingContactName: optionalText(150).default(''),
  shippingPhone: optionalText(20).default(''),
  carrier: optionalText(150).default(''),
  deliveryEmployeeIds: Joi.array()
    .items(
      Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
    )
    .default([]),
  deliveryEmployeeId: Joi.string()
    .allow(null, '')
    .pattern(OBJECT_ID_RULE)
    .message(OBJECT_ID_RULE_MESSAGE)
    .optional(),
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
  next.tripId = next.tripId ? new ObjectId(next.tripId) : null
  const deliveryIds = new Set()
  if (Array.isArray(next.deliveryEmployeeIds)) {
    for (const id of next.deliveryEmployeeIds) {
      if (id) deliveryIds.add(String(id))
    }
  }
  if (next.deliveryEmployeeId) {
    deliveryIds.add(String(next.deliveryEmployeeId))
  }
  next.deliveryEmployeeIds = [...deliveryIds].map((id) => new ObjectId(id))
  delete next.deliveryEmployeeId
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

const findOneByCode = async (code) => {
  if (!code) return null
  const normalized = String(code).trim()
  return await GET_DB().collection(ORDER_COLLECTION_NAME).findOne({
    code: { $regex: `^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
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

  if (dataToUpdate.tripId !== undefined) {
    dataToUpdate.tripId = dataToUpdate.tripId ? new ObjectId(dataToUpdate.tripId) : null
  }

  if (Array.isArray(dataToUpdate.deliveryEmployeeIds)) {
    const deliveryIds = new Set()
    for (const id of dataToUpdate.deliveryEmployeeIds) {
      if (id) deliveryIds.add(String(id))
    }
    dataToUpdate.deliveryEmployeeIds = [...deliveryIds].map((id) => new ObjectId(id))
    dataToUpdate.deliveryEmployeeId = null
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

const claimInventoryExport = async (id) => {
  const staleBefore = new Date(Date.now() - 2 * 60 * 1000)
  return await GET_DB()
    .collection(ORDER_COLLECTION_NAME)
    .findOneAndUpdate(
      {
        _id: new ObjectId(id),
        _destroy: false,
        status: ORDER_STATUS.PENDING,
        inventoryExported: { $ne: true },
        $or: [
          { inventoryExportClaimedAt: null },
          { inventoryExportClaimedAt: { $lt: staleBefore } }
        ]
      },
      {
        $set: {
          inventoryExportClaimedAt: new Date(),
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    )
}

const releaseInventoryExportClaim = async (id) => {
  return await GET_DB()
    .collection(ORDER_COLLECTION_NAME)
    .updateOne(
      { _id: new ObjectId(id), _destroy: false },
      {
        $set: {
          inventoryExportClaimedAt: null,
          updatedAt: new Date()
        }
      }
    )
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
  findOneByCode,
  findMany,
  update,
  claimInventoryExport,
  releaseInventoryExportClaim,
  deleteOne,
  countByStatus,
  sumCompletedTotal
}
