import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const ORDER_AUDIT_COLLECTION_NAME = 'order_audits'

const AUDIT_ACTION = {
  CREATED: 'created',
  STATUS_CHANGED: 'status_changed',
  CONFIRMED_EXPORTED: 'confirmed_exported',
  CANCELLED: 'cancelled',
  PAYMENT_RECORDED: 'payment_recorded',
  DELETED: 'deleted'
}

const ORDER_AUDIT_SCHEMA = Joi.object({
  orderId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  orderCode: Joi.string().trim().allow('').max(50).default(''),
  action: Joi.string()
    .valid(...Object.values(AUDIT_ACTION))
    .required(),
  actorUserId: Joi.string()
    .allow(null, '')
    .pattern(OBJECT_ID_RULE)
    .message(OBJECT_ID_RULE_MESSAGE)
    .default(null),
  meta: Joi.object().unknown(true).default({}),
  createdAt: Joi.date().default(() => new Date())
})

const validateBeforeCreate = async (data) => {
  return await ORDER_AUDIT_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  const validData = await validateBeforeCreate(data)
  validData.orderId = new ObjectId(validData.orderId)
  validData.actorUserId = validData.actorUserId
    ? new ObjectId(validData.actorUserId)
    : null

  return await GET_DB()
    .collection(ORDER_AUDIT_COLLECTION_NAME)
    .insertOne(validData)
}

const findByOrderId = async (orderId, options = {}) => {
  const { limit = 100, skip = 0 } = options
  const findQuery = { orderId: new ObjectId(orderId) }

  const items = await GET_DB()
    .collection(ORDER_AUDIT_COLLECTION_NAME)
    .find(findQuery)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .toArray()

  const total = await GET_DB()
    .collection(ORDER_AUDIT_COLLECTION_NAME)
    .countDocuments(findQuery)

  return { items, total, limit, skip }
}

export const orderAuditModel = {
  ORDER_AUDIT_COLLECTION_NAME,
  AUDIT_ACTION,
  createNew,
  findByOrderId
}
