import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const STATE_COLLECTION = 'oilStates'
const EVENT_COLLECTION = 'oilEvents'

const stateOf = (driverId) => {
  return GET_DB().collection(STATE_COLLECTION).findOne({ driverId: new ObjectId(driverId) })
}

const listStates = async () => {
  return await GET_DB().collection(STATE_COLLECTION).find({}).toArray()
}

const saveState = async (driverId, data) => {
  const id = new ObjectId(driverId)
  const result = await GET_DB().collection(STATE_COLLECTION).findOneAndUpdate(
    { driverId: id },
    { $set: { ...data, driverId: id, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true, returnDocument: 'after' }
  )
  if (result == null) return null
  if (Object.prototype.hasOwnProperty.call(result, 'value') && !Object.prototype.hasOwnProperty.call(result, '_id')) {
    return result.value ?? null
  }
  return result
}

const addEvent = async (data) => {
  return await GET_DB().collection(EVENT_COLLECTION).insertOne({
    ...data,
    driverId: new ObjectId(data.driverId),
    createdAt: new Date(),
    _destroy: false
  })
}

const listEvents = async (driverId) => {
  return await GET_DB().collection(EVENT_COLLECTION)
    .find({ driverId: new ObjectId(driverId), _destroy: false })
    .sort({ createdAt: -1 })
    .limit(40)
    .toArray()
}

const ensureIndexes = async () => {
  await GET_DB().collection(STATE_COLLECTION).createIndex({ driverId: 1 }, { unique: true })
  await GET_DB().collection(EVENT_COLLECTION).createIndex({ driverId: 1, createdAt: -1 })
}

export const oilModel = {
  stateOf,
  listStates,
  saveState,
  addEvent,
  listEvents,
  ensureIndexes
}
