import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const PRODUCT_COLLECTION_NAME = 'products'

const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
}

const optionalText = (max) => Joi.string().trim().allow('').max(max)

const PRODUCT_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required().min(2).max(200).trim(),
  sku: optionalText(50).default(''),
  categoryId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  pestType: optionalText(100).default(''),
  description: optionalText(20000).default(''),
  shortDescription: optionalText(300).default(''),
  unit: optionalText(30).default('chai'),
  unitsPerCase: Joi.number().integer().min(1).default(1),
  price: Joi.number().required().min(0),
  costPrice: Joi.number().min(0).default(0),
  activeIngredient: optionalText(200).default(''),
  packaging: optionalText(100).default(''),
  image: optionalText(500).default(''),
  images: Joi.array().items(optionalText(500)).max(5).default([]),
  displayOrder: Joi.number().integer().min(0).default(0),
  status: Joi.string()
    .valid(PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.INACTIVE)
    .default(PRODUCT_STATUS.ACTIVE),
  createdBy: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await PRODUCT_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  const validData = await validateBeforeCreate(data)
  validData.categoryId = new ObjectId(validData.categoryId)
  validData.createdBy = new ObjectId(validData.createdBy)
  return await GET_DB().collection(PRODUCT_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(PRODUCT_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    _destroy: false
  })
}

const findMany = async (query = {}, options = {}) => {
  const {
    limit = 50,
    skip = 0,
    sort = { displayOrder: 1, createdAt: -1 }
  } = options

  const findQuery = { _destroy: false, ...query }

  const items = await GET_DB()
    .collection(PRODUCT_COLLECTION_NAME)
    .find(findQuery)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .toArray()

  const total = await GET_DB()
    .collection(PRODUCT_COLLECTION_NAME)
    .countDocuments(findQuery)

  return { items, total, limit, skip }
}

const update = async (id, updateData) => {
  const dataToUpdate = {
    ...updateData,
    updatedAt: new Date()
  }

  if (dataToUpdate.categoryId) {
    dataToUpdate.categoryId = new ObjectId(dataToUpdate.categoryId)
  }

  return await GET_DB()
    .collection(PRODUCT_COLLECTION_NAME)
    .updateOne({ _id: new ObjectId(id), _destroy: false }, { $set: dataToUpdate })
}

const deleteOne = async (id) => {
  return await GET_DB()
    .collection(PRODUCT_COLLECTION_NAME)
    .updateOne(
      { _id: new ObjectId(id) },
      { $set: { _destroy: true, updatedAt: new Date() } }
    )
}

export const productModel = {
  PRODUCT_COLLECTION_NAME,
  PRODUCT_STATUS,
  createNew,
  findOneById,
  findMany,
  update,
  deleteOne
}
