import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const PAYROLL_COLLECTION_NAME = 'payroll_periods'

const PAYROLL_STATUS = {
  DRAFT: 'draft',
  LOCKED: 'locked'
}

const PAYROLL_COLLECTION_SCHEMA = Joi.object({
  period: Joi.string()
    .required()
    .pattern(/^\d{4}-\d{2}$/),
  status: Joi.string()
    .valid(PAYROLL_STATUS.DRAFT, PAYROLL_STATUS.LOCKED)
    .default(PAYROLL_STATUS.DRAFT),
  lines: Joi.array().items(Joi.object()).default([]),
  note: Joi.string().trim().allow('').max(2000).default(''),
  createdBy: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(null),
  lockedAt: Joi.date().allow(null).default(null),
  lockedBy: Joi.string()
    .allow(null, '')
    .pattern(OBJECT_ID_RULE)
    .message(OBJECT_ID_RULE_MESSAGE)
    .default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await PAYROLL_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  const validData = await validateBeforeCreate(data)
  validData.createdBy = new ObjectId(validData.createdBy)
  validData.lockedBy = validData.lockedBy ? new ObjectId(validData.lockedBy) : null
  return await GET_DB().collection(PAYROLL_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(PAYROLL_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    _destroy: false
  })
}

const findOneByPeriod = async (period) => {
  return await GET_DB().collection(PAYROLL_COLLECTION_NAME).findOne({
    period,
    _destroy: false
  })
}

const findMany = async (query = {}, options = {}) => {
  const { limit = 50, skip = 0, sort = { period: -1 } } = options
  const findQuery = { _destroy: false, ...query }

  const items = await GET_DB()
    .collection(PAYROLL_COLLECTION_NAME)
    .find(findQuery)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .toArray()

  const total = await GET_DB()
    .collection(PAYROLL_COLLECTION_NAME)
    .countDocuments(findQuery)

  return { items, total, limit, skip }
}

const update = async (id, updateData) => {
  const dataToUpdate = { ...updateData, updatedAt: new Date() }
  if (dataToUpdate.lockedBy !== undefined) {
    dataToUpdate.lockedBy = dataToUpdate.lockedBy
      ? new ObjectId(dataToUpdate.lockedBy)
      : null
  }

  return await GET_DB()
    .collection(PAYROLL_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(id), _destroy: false },
      { $set: dataToUpdate },
      { returnDocument: 'after' }
    )
}

const deleteOne = async (id) => {
  return await GET_DB()
    .collection(PAYROLL_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(id), _destroy: false },
      { $set: { _destroy: true, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
}

export const payrollModel = {
  PAYROLL_COLLECTION_NAME,
  PAYROLL_STATUS,
  createNew,
  findOneById,
  findOneByPeriod,
  findMany,
  update,
  deleteOne
}
