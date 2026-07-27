import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const EMPLOYEE_COLLECTION_NAME = 'employees'

const EMPLOYEE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
}

const optionalText = (max) => Joi.string().trim().allow('').max(max)

const EMPLOYEE_COLLECTION_SCHEMA = Joi.object({
  code: Joi.string().required().trim().max(50),
  fullName: Joi.string().required().min(2).max(150).trim(),
  phone: optionalText(20).default(''),
  email: optionalText(150).default(''),
  title: optionalText(100).default(''),
  department: optionalText(100).default(''),
  userId: Joi.string()
    .allow(null, '')
    .pattern(OBJECT_ID_RULE)
    .message(OBJECT_ID_RULE_MESSAGE)
    .default(null),
  baseSalary: Joi.number().min(0).default(0),
  commissionPercent: Joi.number().min(0).max(100).default(0),
  allowance: Joi.number().min(0).default(0),
  bankAccount: optionalText(100).default(''),
  bankName: optionalText(150).default(''),
  bankQrImage: optionalText(500).default(''),
  status: Joi.string()
    .valid(EMPLOYEE_STATUS.ACTIVE, EMPLOYEE_STATUS.INACTIVE)
    .default(EMPLOYEE_STATUS.ACTIVE),
  note: optionalText(1000).default(''),
  createdBy: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await EMPLOYEE_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  const validData = await validateBeforeCreate(data)
  validData.createdBy = new ObjectId(validData.createdBy)
  validData.userId = validData.userId ? new ObjectId(validData.userId) : null
  return await GET_DB().collection(EMPLOYEE_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(EMPLOYEE_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    _destroy: false
  })
}

const findMany = async (query = {}, options = {}) => {
  const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options
  const findQuery = { _destroy: false, ...query }

  const items = await GET_DB()
    .collection(EMPLOYEE_COLLECTION_NAME)
    .find(findQuery)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .toArray()

  const total = await GET_DB()
    .collection(EMPLOYEE_COLLECTION_NAME)
    .countDocuments(findQuery)

  return { items, total, limit, skip }
}

const update = async (id, updateData) => {
  const dataToUpdate = { ...updateData, updatedAt: new Date() }
  if (dataToUpdate.userId !== undefined) {
    dataToUpdate.userId = dataToUpdate.userId ? new ObjectId(dataToUpdate.userId) : null
  }

  return await GET_DB()
    .collection(EMPLOYEE_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(id), _destroy: false },
      { $set: dataToUpdate },
      { returnDocument: 'after' }
    )
}

const deleteOne = async (id) => {
  return await GET_DB()
    .collection(EMPLOYEE_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(id), _destroy: false },
      { $set: { _destroy: true, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
}

export const employeeModel = {
  EMPLOYEE_COLLECTION_NAME,
  EMPLOYEE_STATUS,
  createNew,
  findOneById,
  findMany,
  update,
  deleteOne
}
