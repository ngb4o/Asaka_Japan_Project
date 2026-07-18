import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { GET_DB } from '~/config/mongodb'

const NEWS_COLLECTION_NAME = 'news'

const NEWS_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
}

const optionalText = (max) => Joi.string().trim().allow('').max(max)

const NEWS_COLLECTION_SCHEMA = Joi.object({
  title: Joi.string().required().min(2).max(300).trim(),
  slug: Joi.string().required().min(2).max(320).trim(),
  content: Joi.string().required().min(2).max(50000).trim(),
  image: optionalText(500).default(''),
  displayOrder: Joi.number().integer().min(0).default(0),
  status: Joi.string()
    .valid(NEWS_STATUS.ACTIVE, NEWS_STATUS.INACTIVE)
    .default(NEWS_STATUS.ACTIVE),
  createdBy: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await NEWS_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  const validData = await validateBeforeCreate(data)
  validData.createdBy = new ObjectId(validData.createdBy)
  return await GET_DB().collection(NEWS_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(NEWS_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    _destroy: false
  })
}

const findOneBySlug = async (slug, excludeId = null) => {
  const query = { slug, _destroy: false }

  if (excludeId) {
    query._id = { $ne: new ObjectId(excludeId) }
  }

  return await GET_DB().collection(NEWS_COLLECTION_NAME).findOne(query)
}

const findMany = async (query = {}, options = {}) => {
  const {
    limit = 50,
    skip = 0,
    sort = { displayOrder: 1, createdAt: -1 }
  } = options

  const findQuery = { _destroy: false, ...query }

  const items = await GET_DB()
    .collection(NEWS_COLLECTION_NAME)
    .find(findQuery)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .toArray()

  const total = await GET_DB()
    .collection(NEWS_COLLECTION_NAME)
    .countDocuments(findQuery)

  return { items, total, limit, skip }
}

const update = async (id, updateData) => {
  const dataToUpdate = {
    ...updateData,
    updatedAt: new Date()
  }

  return await GET_DB()
    .collection(NEWS_COLLECTION_NAME)
    .updateOne({ _id: new ObjectId(id), _destroy: false }, { $set: dataToUpdate })
}

const deleteOne = async (id) => {
  return await GET_DB()
    .collection(NEWS_COLLECTION_NAME)
    .updateOne(
      { _id: new ObjectId(id) },
      { $set: { _destroy: true, updatedAt: new Date() } }
    )
}

export const newsModel = {
  NEWS_COLLECTION_NAME,
  NEWS_STATUS,
  createNew,
  findOneById,
  findOneBySlug,
  findMany,
  update,
  deleteOne
}
