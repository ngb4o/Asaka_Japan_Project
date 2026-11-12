import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const SLIP_COLLECTION_NAME = 'slips'

const SLIP_SCHEMA = Joi.object({
  kind: Joi.string().valid('xuat-vat-tu').required(),
  requester: Joi.string().trim().min(1).max(150).required(),
  driverId: Joi.string().trim().allow('').max(50).default(''),
  driverName: Joi.string().trim().min(1).max(150).required(),
  plate: Joi.string().trim().allow('').max(20).default(''),
  mooc: Joi.string().trim().allow('').max(20).default(''),
  km: Joi.number().min(0).required(),
  lines: Joi.array().items(Joi.object({
    movementId: Joi.any().required(),
    itemName: Joi.string().trim().min(1).max(200).required(),
    unit: Joi.string().trim().allow('').max(50).default(''),
    quantity: Joi.number().greater(0).required(),
    note: Joi.string().trim().allow('').max(300).default('')
  })).min(1).max(10).required(),
  createdBy: Joi.string().trim().allow('').max(80).default(''),
  status: Joi.string().valid('draft').default('draft'),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(() => new Date())
})

const createNew = async (data, session = null) => {
  const validData = await SLIP_SCHEMA.validateAsync(data, { abortEarly: false })
  validData.lines = validData.lines.map((line) => ({
    ...line,
    movementId: new ObjectId(line.movementId)
  }))
  const options = session ? { session } : {}
  return await GET_DB().collection(SLIP_COLLECTION_NAME).insertOne(validData, options)
}

const ensureIndexes = async () => {
  await GET_DB().collection(SLIP_COLLECTION_NAME).createIndex({ createdAt: -1 })
}

export const slipModel = {
  SLIP_COLLECTION_NAME,
  createNew,
  ensureIndexes
}
