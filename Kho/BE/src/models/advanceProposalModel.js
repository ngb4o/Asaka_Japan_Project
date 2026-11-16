import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'

const ADVANCE_PROPOSAL_COLLECTION_NAME = 'advanceProposals'

const ADVANCE_PROPOSAL_SCHEMA = Joi.object({
  reportDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  fullName: Joi.string().trim().min(1).max(80).required(),
  department: Joi.string().trim().min(1).max(80).required(),
  content: Joi.string().trim().min(1).max(500).required(),
  amount: Joi.number().integer().min(1).max(999_999_999_999).required(),
  amountWords: Joi.string().trim().min(1).max(300).required(),
  bankAccount: Joi.string().trim().min(1).max(160).required(),
  createdBy: Joi.string().trim().allow('').max(80).default(''),
  status: Joi.string().valid('draft').default('draft'),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(() => new Date())
})

const createNew = async (data) => {
  const validData = await ADVANCE_PROPOSAL_SCHEMA.validateAsync(data, { abortEarly: false })
  return await GET_DB().collection(ADVANCE_PROPOSAL_COLLECTION_NAME).insertOne(validData)
}

const ensureIndexes = async () => {
  await GET_DB().collection(ADVANCE_PROPOSAL_COLLECTION_NAME).createIndex({ updatedAt: -1 })
}

export const advanceProposalModel = {
  ADVANCE_PROPOSAL_COLLECTION_NAME,
  createNew,
  ensureIndexes
}
