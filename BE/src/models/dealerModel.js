import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const DEALER_COLLECTION_NAME = 'dealers'

const DEALER_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  INACTIVE: 'inactive'
}

const DEALER_TIER = {
  STANDARD: 'standard',
  SILVER: 'silver',
  GOLD: 'gold'
}

const optionalText = (max) => Joi.string().trim().allow('').max(max)

const DEALER_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required().min(2).max(150).trim(),
  contactName: optionalText(100).default(''),
  phone: Joi.string().required().min(8).max(20).trim(),
  email: optionalText(150).default(''),
  address: optionalText(300).default(''),
  region: optionalText(100).default(''),
  tier: Joi.string()
    .valid(DEALER_TIER.STANDARD, DEALER_TIER.SILVER, DEALER_TIER.GOLD)
    .default(DEALER_TIER.STANDARD),
  discountPercent: Joi.number().min(0).max(100).default(0),
  status: Joi.string()
    .valid(DEALER_STATUS.PENDING, DEALER_STATUS.ACTIVE, DEALER_STATUS.INACTIVE)
    .default(DEALER_STATUS.PENDING),
  note: optionalText(1000).default(''),
  leadId: Joi.string()
    .allow(null, '')
    .pattern(OBJECT_ID_RULE)
    .message(OBJECT_ID_RULE_MESSAGE)
    .default(null),
  createdBy: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await DEALER_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  const validData = await validateBeforeCreate(data)
  validData.createdBy = new ObjectId(validData.createdBy)

  if (validData.leadId) {
    validData.leadId = new ObjectId(validData.leadId)
  } else {
    validData.leadId = null
  }

  return await GET_DB().collection(DEALER_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(DEALER_COLLECTION_NAME).findOne({
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
    .collection(DEALER_COLLECTION_NAME)
    .find(findQuery)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .toArray()

  const total = await GET_DB()
    .collection(DEALER_COLLECTION_NAME)
    .countDocuments(findQuery)

  return { items, total, limit, skip }
}

const update = async (id, updateData) => {
  const dataToUpdate = {
    ...updateData,
    updatedAt: new Date()
  }

  if (dataToUpdate.leadId) {
    dataToUpdate.leadId = new ObjectId(dataToUpdate.leadId)
  }

  return await GET_DB()
    .collection(DEALER_COLLECTION_NAME)
    .updateOne({ _id: new ObjectId(id), _destroy: false }, { $set: dataToUpdate })
}

const deleteOne = async (id) => {
  return await GET_DB()
    .collection(DEALER_COLLECTION_NAME)
    .updateOne(
      { _id: new ObjectId(id) },
      { $set: { _destroy: true, updatedAt: new Date() } }
    )
}

const countByStatus = async (status) => {
  return await GET_DB().collection(DEALER_COLLECTION_NAME).countDocuments({
    _destroy: false,
    status
  })
}

export const dealerModel = {
  DEALER_COLLECTION_NAME,
  DEALER_STATUS,
  DEALER_TIER,
  createNew,
  findOneById,
  findMany,
  update,
  deleteOne,
  countByStatus
}
