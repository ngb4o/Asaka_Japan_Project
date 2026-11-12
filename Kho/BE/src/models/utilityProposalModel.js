import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'

const UTILITY_PROPOSAL_COLLECTION_NAME = 'utilityProposals'

const reading = (label) => Joi.number().integer().min(0).required().messages({
  'number.base': `Nhập ${label}`,
  'number.integer': `${label} phải là số nguyên`,
  'number.min': `${label} không được âm`,
  'any.required': `Nhập ${label}`
})

const UTILITY_PROPOSAL_SCHEMA = Joi.object({
  reportDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  period: Joi.string().trim().min(1).max(80).required(),
  subject: Joi.string().trim().min(1).max(200).required(),
  content: Joi.string().trim().min(1).max(800).required(),
  paymentTitle: Joi.string().trim().min(1).max(200).required(),
  amountWords: Joi.string().trim().min(1).max(200).required(),
  electricStart: reading('số đầu điện'),
  electricEnd: reading('số cuối điện'),
  electricPrice: reading('đơn giá điện'),
  electricNote: Joi.string().trim().allow('').max(300).default(''),
  waterStart: reading('số đầu nước'),
  waterEnd: reading('số cuối nước'),
  waterPrice: reading('đơn giá nước'),
  waterNote: Joi.string().trim().allow('').max(300).default(''),
  sanitationFee: reading('tiền nước vệ sinh'),
  sanitationNote: Joi.string().trim().allow('').max(300).default(''),
  internetFee: reading('tiền internet'),
  internetNote: Joi.string().trim().allow('').max(300).default(''),
  createdBy: Joi.string().trim().allow('').max(80).default(''),
  status: Joi.string().valid('draft').default('draft'),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(() => new Date())
}).custom((value, helpers) => {
  if (value.electricEnd < value.electricStart) return helpers.message('Số cuối điện phải lớn hơn hoặc bằng số đầu')
  if (value.waterEnd < value.waterStart) return helpers.message('Số cuối nước phải lớn hơn hoặc bằng số đầu')
  return value
})

const createNew = async (data) => {
  const validData = await UTILITY_PROPOSAL_SCHEMA.validateAsync(data, { abortEarly: false })
  return await GET_DB().collection(UTILITY_PROPOSAL_COLLECTION_NAME).insertOne(validData)
}

const ensureIndexes = async () => {
  await GET_DB().collection(UTILITY_PROPOSAL_COLLECTION_NAME).createIndex({ updatedAt: -1 })
}

export const utilityProposalModel = {
  UTILITY_PROPOSAL_COLLECTION_NAME,
  createNew,
  ensureIndexes
}
