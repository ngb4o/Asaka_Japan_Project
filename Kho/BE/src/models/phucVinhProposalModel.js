import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'

const PHUC_VINH_PROPOSAL_COLLECTION_NAME = 'phucVinhProposals'

const LINE_SCHEMA = Joi.object({
  itemName: Joi.string().trim().min(1).max(200).required(),
  unit: Joi.string().trim().allow('').max(50).default(''),
  quantity: Joi.number().greater(0).required(),
  price: Joi.number().integer().min(0).allow(null).default(null),
  stock: Joi.number().integer().min(0).allow(null).default(null),
  supplier: Joi.string().trim().allow('').max(120).default(''),
  receiver: Joi.string().trim().allow('').max(120).default('')
})

const PHUC_VINH_PROPOSAL_SCHEMA = Joi.object({
  reportDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  subject: Joi.string().trim().min(1).max(200).required(),
  content: Joi.string().trim().min(1).max(800).required(),
  lines: Joi.array().items(LINE_SCHEMA).min(1).max(30).required(),
  createdBy: Joi.string().trim().allow('').max(80).default(''),
  status: Joi.string().valid('draft').default('draft'),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(() => new Date())
})

const createNew = async (data) => {
  const validData = await PHUC_VINH_PROPOSAL_SCHEMA.validateAsync(data, { abortEarly: false })
  return await GET_DB().collection(PHUC_VINH_PROPOSAL_COLLECTION_NAME).insertOne(validData)
}

const ensureIndexes = async () => {
  await GET_DB().collection(PHUC_VINH_PROPOSAL_COLLECTION_NAME).createIndex({ updatedAt: -1 })
}

export const phucVinhProposalModel = {
  PHUC_VINH_PROPOSAL_COLLECTION_NAME,
  createNew,
  ensureIndexes
}
