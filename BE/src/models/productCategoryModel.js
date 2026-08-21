import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const PRODUCT_CATEGORY_COLLECTION_NAME = 'product_categories'

const PRODUCT_CATEGORY_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
}

const optionalText = Joi.string().trim().allow('').max(500)

const PEST_TYPE_ITEM_SCHEMA = Joi.object({
  value: Joi.string().required().max(100).trim(),
  label: Joi.string().required().max(200).trim()
})

const PRODUCT_CATEGORY_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required().min(2).max(100).trim(),
  slug: Joi.string().required().min(2).max(120).trim(),
  description: optionalText.default(''),
  pestTypes: Joi.array().items(PEST_TYPE_ITEM_SCHEMA).default([]),
  status: Joi.string()
    .valid(PRODUCT_CATEGORY_STATUS.ACTIVE, PRODUCT_CATEGORY_STATUS.INACTIVE)
    .default(PRODUCT_CATEGORY_STATUS.ACTIVE),
  createdBy: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await PRODUCT_CATEGORY_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  const validData = await validateBeforeCreate(data)
  validData.createdBy = new ObjectId(validData.createdBy)
  return await GET_DB().collection(PRODUCT_CATEGORY_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(PRODUCT_CATEGORY_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    _destroy: false
  })
}

const findOneBySlug = async (slug) => {
  return await GET_DB().collection(PRODUCT_CATEGORY_COLLECTION_NAME).findOne({
    slug,
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
    .collection(PRODUCT_CATEGORY_COLLECTION_NAME)
    .find(findQuery)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .toArray()

  const total = await GET_DB()
    .collection(PRODUCT_CATEGORY_COLLECTION_NAME)
    .countDocuments(findQuery)

  return { items, total, limit, skip }
}

const update = async (id, updateData) => {
  const dataToUpdate = {
    ...updateData,
    updatedAt: new Date()
  }

  return await GET_DB()
    .collection(PRODUCT_CATEGORY_COLLECTION_NAME)
    .updateOne({ _id: new ObjectId(id), _destroy: false }, { $set: dataToUpdate })
}

const deleteOne = async (id) => {
  return await GET_DB()
    .collection(PRODUCT_CATEGORY_COLLECTION_NAME)
    .updateOne(
      { _id: new ObjectId(id) },
      { $set: { _destroy: true, updatedAt: new Date() } }
    )
}

const countProductsByCategoryId = async (categoryId) => {
  return await GET_DB().collection('products').countDocuments({
    categoryId: new ObjectId(categoryId),
    _destroy: false
  })
}

export const productCategoryModel = {
  PRODUCT_CATEGORY_COLLECTION_NAME,
  PRODUCT_CATEGORY_STATUS,
  createNew,
  findOneById,
  findOneBySlug,
  findMany,
  update,
  deleteOne,
  countProductsByCategoryId
}
