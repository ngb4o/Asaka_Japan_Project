import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const TIRE_COLLECTION_NAME = 'tires'
const TIRE_EVENT_COLLECTION_NAME = 'tireEvents'

const PLACE_SCHEMA = Joi.object({
  kind: Joi.string().valid('dau', 'mooc', 'kho').required(),
  plate: Joi.string().trim().allow('').max(20).default(''),
  axle: Joi.number().integer().min(1).max(12).allow(null).default(null),
  position: Joi.string().trim().allow('').max(20).default('')
})

const TIRE_SCHEMA = Joi.object({
  serial: Joi.string().trim().min(1).max(40).required(),
  serialKey: Joi.string().trim().min(1).max(40).required(),
  brand: Joi.string().trim().allow('').max(60).default(''),
  wear: Joi.number().integer().min(0).max(100).default(100),
  place: PLACE_SCHEMA.required(),
  note: Joi.string().trim().allow('').max(300).default(''),
  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(() => new Date()),
  _destroy: Joi.boolean().default(false)
})

const EVENT_SCHEMA = Joi.object({
  tireId: Joi.any().required(),
  serial: Joi.string().trim().required(),
  type: Joi.string().valid('nhap', 'gan', 'chuyen', 'thao').required(),
  from: PLACE_SCHEMA.allow(null).default(null),
  to: PLACE_SCHEMA.required(),
  note: Joi.string().trim().allow('').max(300).default(''),
  wear: Joi.number().integer().min(0).max(100).allow(null).default(null),
  createdBy: Joi.string().trim().allow('').max(80).default(''),
  createdAt: Joi.date().default(() => new Date())
})

const createNew = async (data, session = null) => {
  const validData = await TIRE_SCHEMA.validateAsync(data, { abortEarly: false })
  const options = session ? { session } : {}
  return await GET_DB().collection(TIRE_COLLECTION_NAME).insertOne(validData, options)
}

const findOneById = async (id) => {
  return await GET_DB().collection(TIRE_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    _destroy: false
  })
}

const findBySerialKey = async (serialKey) => {
  return await GET_DB().collection(TIRE_COLLECTION_NAME).findOne({
    serialKey,
    _destroy: false
  })
}

const findOnVehicle = async (kind, plate) => {
  return await GET_DB().collection(TIRE_COLLECTION_NAME).find({
    _destroy: false,
    'place.kind': kind,
    'place.plate': plate
  }).toArray()
}

const findOccupant = async (place, exceptId = null) => {
  const filter = {
    _destroy: false,
    'place.kind': place.kind,
    'place.plate': place.plate,
    'place.axle': place.axle,
    'place.position': place.position
  }
  if (exceptId) filter._id = { $ne: new ObjectId(exceptId) }
  return await GET_DB().collection(TIRE_COLLECTION_NAME).findOne(filter)
}

const findMany = async (query = {}, options = {}) => {
  const { limit = 50, skip = 0, sort = { updatedAt: -1 } } = options
  const collection = GET_DB().collection(TIRE_COLLECTION_NAME)
  const items = await collection.find(query).sort(sort).skip(skip).limit(limit).toArray()
  const total = await collection.countDocuments(query)
  return { items, total, limit, skip }
}

const unwrapFindOneAndUpdate = (result) => {
  if (result == null) return null
  if (Object.prototype.hasOwnProperty.call(result, 'value') && !Object.prototype.hasOwnProperty.call(result, '_id')) {
    return result.value ?? null
  }
  return result
}

const updatePlace = async (id, fields) => {
  const result = await GET_DB().collection(TIRE_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(id), _destroy: false },
    { $set: { ...fields, updatedAt: new Date() } },
    { returnDocument: 'after' }
  )
  return unwrapFindOneAndUpdate(result)
}

const addEvent = async (data, session = null) => {
  const validData = await EVENT_SCHEMA.validateAsync(data, { abortEarly: false })
  validData.tireId = new ObjectId(validData.tireId)
  const options = session ? { session } : {}
  return await GET_DB().collection(TIRE_EVENT_COLLECTION_NAME).insertOne(validData, options)
}

const renameEvents = async (tireId, serial) => {
  await GET_DB().collection(TIRE_EVENT_COLLECTION_NAME).updateMany(
    { tireId: new ObjectId(tireId) },
    { $set: { serial } }
  )
}

const listEvents = async (tireId) => {
  return await GET_DB().collection(TIRE_EVENT_COLLECTION_NAME)
    .find({ tireId: new ObjectId(tireId) })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray()
}

const ensureIndexes = async () => {
  const tires = GET_DB().collection(TIRE_COLLECTION_NAME)
  await tires.createIndex(
    { serialKey: 1 },
    { unique: true, partialFilterExpression: { _destroy: false } }
  )
  await tires.createIndex({ 'place.kind': 1, 'place.plate': 1, 'place.axle': 1, 'place.position': 1 })
  await GET_DB().collection(TIRE_EVENT_COLLECTION_NAME).createIndex({ tireId: 1, createdAt: -1 })
}

export const tireModel = {
  TIRE_COLLECTION_NAME,
  TIRE_EVENT_COLLECTION_NAME,
  createNew,
  findOneById,
  findBySerialKey,
  findOnVehicle,
  findOccupant,
  findMany,
  updatePlace,
  addEvent,
  renameEvents,
  listEvents,
  ensureIndexes
}
