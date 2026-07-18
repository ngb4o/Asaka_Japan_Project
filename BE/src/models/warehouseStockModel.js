import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const WAREHOUSE_STOCK_COLLECTION_NAME = 'warehouse_stocks'

const WAREHOUSE_STOCK_SCHEMA = Joi.object({
  warehouseId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  productId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  quantity: Joi.number().required().min(0),
  updatedAt: Joi.date().default(() => new Date())
})

const validateBeforeCreate = async (data) => {
  return await WAREHOUSE_STOCK_SCHEMA.validateAsync(data, { abortEarly: false })
}

const findOneByWarehouseAndProduct = async (warehouseId, productId, session = null) => {
  const options = session ? { session } : {}

  return await GET_DB().collection(WAREHOUSE_STOCK_COLLECTION_NAME).findOne(
    {
      warehouseId: new ObjectId(warehouseId),
      productId: new ObjectId(productId)
    },
    options
  )
}

const findMany = async (query = {}, options = {}) => {
  const {
    limit = 50,
    skip = 0,
    sort = { updatedAt: -1 }
  } = options

  const items = await GET_DB()
    .collection(WAREHOUSE_STOCK_COLLECTION_NAME)
    .find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .toArray()

  const total = await GET_DB()
    .collection(WAREHOUSE_STOCK_COLLECTION_NAME)
    .countDocuments(query)

  return { items, total, limit, skip }
}

const increaseStock = async (warehouseId, productId, quantity, session = null) => {
  const options = session ? { session } : {}
  const now = new Date()
  const warehouseObjectId = new ObjectId(warehouseId)
  const productObjectId = new ObjectId(productId)

  const result = await GET_DB().collection(WAREHOUSE_STOCK_COLLECTION_NAME).findOneAndUpdate(
    {
      warehouseId: warehouseObjectId,
      productId: productObjectId
    },
    {
      $inc: { quantity },
      $set: { updatedAt: now },
      $setOnInsert: {
        warehouseId: warehouseObjectId,
        productId: productObjectId
      }
    },
    {
      upsert: true,
      returnDocument: 'after',
      ...options
    }
  )

  // MongoDB Node driver v5 returns { value: document }
  return result?.value ?? result
}

const decreaseStock = async (warehouseId, productId, quantity, session = null) => {
  const options = session ? { session } : {}
  const now = new Date()

  const result = await GET_DB().collection(WAREHOUSE_STOCK_COLLECTION_NAME).findOneAndUpdate(
    {
      warehouseId: new ObjectId(warehouseId),
      productId: new ObjectId(productId),
      quantity: { $gte: quantity }
    },
    {
      $inc: { quantity: -quantity },
      $set: { updatedAt: now }
    },
    {
      returnDocument: 'after',
      ...options
    }
  )

  return result?.value ?? result
}

const getTotalByProductId = async (productId) => {
  const result = await GET_DB()
    .collection(WAREHOUSE_STOCK_COLLECTION_NAME)
    .aggregate([
      {
        $match: {
          productId: new ObjectId(productId),
          quantity: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$productId',
          total: { $sum: '$quantity' }
        }
      }
    ])
    .toArray()

  return result[0]?.total || 0
}

const getTotalsByProductIds = async (productIds = []) => {
  if (!productIds.length) return new Map()

  const objectIds = productIds.map((id) => new ObjectId(id))
  const result = await GET_DB()
    .collection(WAREHOUSE_STOCK_COLLECTION_NAME)
    .aggregate([
      {
        $match: {
          productId: { $in: objectIds }
        }
      },
      {
        $group: {
          _id: '$productId',
          total: { $sum: '$quantity' }
        }
      }
    ])
    .toArray()

  return new Map(result.map((item) => [item._id.toString(), item.total]))
}

const countByWarehouseId = async (warehouseId) => {
  return await GET_DB().collection(WAREHOUSE_STOCK_COLLECTION_NAME).countDocuments({
    warehouseId: new ObjectId(warehouseId),
    quantity: { $gt: 0 }
  })
}

const createInitial = async (data, session = null) => {
  const validData = await validateBeforeCreate(data)
  validData.warehouseId = new ObjectId(validData.warehouseId)
  validData.productId = new ObjectId(validData.productId)

  const options = session ? { session } : {}

  return await GET_DB().collection(WAREHOUSE_STOCK_COLLECTION_NAME).insertOne(validData, options)
}

export const warehouseStockModel = {
  WAREHOUSE_STOCK_COLLECTION_NAME,
  findOneByWarehouseAndProduct,
  findMany,
  increaseStock,
  decreaseStock,
  getTotalByProductId,
  getTotalsByProductIds,
  countByWarehouseId,
  createInitial
}
