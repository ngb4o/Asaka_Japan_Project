import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const LEAD_COLLECTION_NAME = 'leads'

const LEAD_TYPE = {
  CONTACT: 'contact',
  DEALER: 'dealer'
}

const LEAD_STATUS = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  CONVERTED: 'converted',
  CLOSED: 'closed'
}

const optionalText = (max) => Joi.string().trim().allow('').max(max)

const LEAD_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required().min(2).max(150).trim(),
  phone: Joi.string().required().min(8).max(20).trim(),
  email: optionalText(150).default(''),
  company: optionalText(150).default(''),
  region: optionalText(100).default(''),
  message: optionalText(2000).default(''),
  type: Joi.string()
    .valid(LEAD_TYPE.CONTACT, LEAD_TYPE.DEALER)
    .default(LEAD_TYPE.CONTACT),
  source: optionalText(50).default('website'),
  status: Joi.string()
    .valid(
      LEAD_STATUS.NEW,
      LEAD_STATUS.CONTACTED,
      LEAD_STATUS.QUALIFIED,
      LEAD_STATUS.CONVERTED,
      LEAD_STATUS.CLOSED
    )
    .default(LEAD_STATUS.NEW),
  note: optionalText(1000).default(''),
  dealerId: Joi.string()
    .allow(null, '')
    .pattern(OBJECT_ID_RULE)
    .message(OBJECT_ID_RULE_MESSAGE)
    .default(null),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await LEAD_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  const validData = await validateBeforeCreate(data)

  if (validData.dealerId) {
    validData.dealerId = new ObjectId(validData.dealerId)
  } else {
    validData.dealerId = null
  }

  return await GET_DB().collection(LEAD_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(LEAD_COLLECTION_NAME).findOne({
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
    .collection(LEAD_COLLECTION_NAME)
    .find(findQuery)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .toArray()

  const total = await GET_DB()
    .collection(LEAD_COLLECTION_NAME)
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

  return await GET_DB()
    .collection(LEAD_COLLECTION_NAME)
    .updateOne({ _id: new ObjectId(id), _destroy: false }, { $set: dataToUpdate })
}

const deleteOne = async (id) => {
  return await GET_DB()
    .collection(LEAD_COLLECTION_NAME)
    .updateOne(
      { _id: new ObjectId(id) },
      { $set: { _destroy: true, updatedAt: new Date() } }
    )
}

const countByStatus = async (status) => {
  return await GET_DB().collection(LEAD_COLLECTION_NAME).countDocuments({
    _destroy: false,
    status
  })
}

export const leadModel = {
  LEAD_COLLECTION_NAME,
  LEAD_TYPE,
  LEAD_STATUS,
  createNew,
  findOneById,
  findMany,
  update,
  deleteOne,
  countByStatus
}
