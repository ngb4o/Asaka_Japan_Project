import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const INVENTORY_TRANSACTION_COLLECTION_NAME = 'inventory_transactions'

const TRANSACTION_TYPE = {
  IMPORT: 'import',
  EXPORT: 'export'
}

const UNIT_TYPE = {
  BOTTLE: 'chai',
  CASE: 'thung'
}

const INVENTORY_TRANSACTION_SCHEMA = Joi.object({
  type: Joi.string().valid(TRANSACTION_TYPE.IMPORT, TRANSACTION_TYPE.EXPORT).required(),
  warehouseId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  productId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  quantity: Joi.number().required().min(1),
  unitType: Joi.string().valid(UNIT_TYPE.BOTTLE, UNIT_TYPE.CASE).required(),
  quantityBase: Joi.number().required().min(1),
  unitsPerCase: Joi.number().integer().min(1).required(),
  note: Joi.string().trim().allow('').max(500).default(''),
  balanceAfter: Joi.number().required().min(0),
  createdBy: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  createdAt: Joi.date().default(() => new Date())
})

const validateBeforeCreate = async (data) => {
  return await INVENTORY_TRANSACTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data, session = null) => {
  const validData = await validateBeforeCreate(data)
  validData.warehouseId = new ObjectId(validData.warehouseId)
  validData.productId = new ObjectId(validData.productId)
  validData.createdBy = new ObjectId(validData.createdBy)

  const options = session ? { session } : {}

  return await GET_DB()
    .collection(INVENTORY_TRANSACTION_COLLECTION_NAME)
    .insertOne(validData, options)
}

const findMany = async (query = {}, options = {}) => {
  const {
    limit = 50,
    skip = 0,
    sort = { createdAt: -1 }
  } = options

  const items = await GET_DB()
    .collection(INVENTORY_TRANSACTION_COLLECTION_NAME)
    .find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .toArray()

  const total = await GET_DB()
    .collection(INVENTORY_TRANSACTION_COLLECTION_NAME)
    .countDocuments(query)

  return { items, total, limit, skip }
}

export const inventoryTransactionModel = {
  INVENTORY_TRANSACTION_COLLECTION_NAME,
  TRANSACTION_TYPE,
  UNIT_TYPE,
  createNew,
  findMany
}
