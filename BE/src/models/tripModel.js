import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const TRIP_COLLECTION_NAME = 'trips'

const TRIP_STATUS = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  SETTLEMENT: 'settlement',
  CLOSED: 'closed',
  CANCELLED: 'cancelled'
}

const EXPENSE_CATEGORY = {
  FUEL: 'fuel',
  FOOD: 'food',
  LODGING: 'lodging',
  TOLL: 'toll',
  PARKING: 'parking',
  OTHER: 'other'
}

const EXPENSE_FUNDING = {
  ADVANCE: 'advance',
  REIMBURSE: 'reimburse'
}

const EXPENSE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

const STOP_PURPOSE = {
  DELIVERY: 'delivery',
  COLLECTION: 'collection',
  MEETING: 'meeting',
  OTHER: 'other'
}

const optionalText = (max) => Joi.string().trim().allow('').max(max)

const TRIP_COLLECTION_SCHEMA = Joi.object({
  code: Joi.string().required().trim().max(50),
  title: optionalText(200).default(''),
  region: optionalText(150).default(''),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  status: Joi.string()
    .valid(...Object.values(TRIP_STATUS))
    .default(TRIP_STATUS.DRAFT),
  memberIds: Joi.array()
    .items(Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE))
    .default([]),
  orderIds: Joi.array()
    .items(Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE))
    .default([]),
  stops: Joi.array().items(Joi.object()).default([]),
  advances: Joi.array().items(Joi.object()).default([]),
  expenses: Joi.array().items(Joi.object()).default([]),
  settlement: Joi.object().allow(null).default(null),
  note: optionalText(2000).default(''),
  createdBy: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await TRIP_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  const validData = await validateBeforeCreate(data)
  validData.createdBy = new ObjectId(validData.createdBy)
  validData.memberIds = (validData.memberIds || []).map((id) => new ObjectId(id))
  validData.orderIds = (validData.orderIds || []).map((id) => new ObjectId(id))
  return await GET_DB().collection(TRIP_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(TRIP_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    _destroy: false
  })
}

const findOneByCode = async (code) => {
  const raw = String(code || '').trim()
  if (!raw) return null
  return await GET_DB().collection(TRIP_COLLECTION_NAME).findOne({
    code: raw,
    _destroy: false
  })
}

const findMany = async (query = {}, options = {}) => {
  const { limit = 50, skip = 0, sort = { startDate: -1 } } = options
  const findQuery = { _destroy: false, ...query }

  const items = await GET_DB()
    .collection(TRIP_COLLECTION_NAME)
    .find(findQuery)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .toArray()

  const total = await GET_DB()
    .collection(TRIP_COLLECTION_NAME)
    .countDocuments(findQuery)

  return { items, total, limit, skip }
}

const update = async (id, updateData) => {
  const dataToUpdate = { ...updateData, updatedAt: new Date() }

  if (dataToUpdate.memberIds) {
    dataToUpdate.memberIds = dataToUpdate.memberIds.map((idValue) => new ObjectId(idValue))
  }
  if (dataToUpdate.orderIds) {
    dataToUpdate.orderIds = dataToUpdate.orderIds.map((idValue) => new ObjectId(idValue))
  }

  return await GET_DB()
    .collection(TRIP_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(id), _destroy: false },
      { $set: dataToUpdate },
      { returnDocument: 'after' }
    )
}

const deleteOne = async (id) => {
  return await GET_DB()
    .collection(TRIP_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(id), _destroy: false },
      { $set: { _destroy: true, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
}

export const tripModel = {
  TRIP_COLLECTION_NAME,
  TRIP_STATUS,
  EXPENSE_CATEGORY,
  EXPENSE_FUNDING,
  EXPENSE_STATUS,
  STOP_PURPOSE,
  createNew,
  findOneById,
  findOneByCode,
  findMany,
  update,
  deleteOne
}
