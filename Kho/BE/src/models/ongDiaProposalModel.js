import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'

const ONG_DIA_PROPOSAL_COLLECTION_NAME = 'ongDiaProposals'

const LINE_SCHEMA = Joi.object({
  itemName: Joi.string().trim().min(1).max(200).required(),
  unit: Joi.string().trim().allow('').max(50).default(''),
  quantity: Joi.number().greater(0).required(),
  price: Joi.number().integer().min(0).required(),
  note: Joi.string().trim().allow('').max(300).default('')
})

const ONG_DIA_PROPOSAL_SCHEMA = Joi.object({
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
  const validData = await ONG_DIA_PROPOSAL_SCHEMA.validateAsync(data, { abortEarly: false })
  return await GET_DB().collection(ONG_DIA_PROPOSAL_COLLECTION_NAME).insertOne(validData)
}

const ensureIndexes = async () => {
  await GET_DB().collection(ONG_DIA_PROPOSAL_COLLECTION_NAME).createIndex({ updatedAt: -1 })
}

export const ongDiaProposalModel = {
  ONG_DIA_PROPOSAL_COLLECTION_NAME,
  createNew,
  ensureIndexes
}
