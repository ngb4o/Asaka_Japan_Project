import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'

const USER_COLLECTION_NAME = 'users'

const USER_SCHEMA = Joi.object({
  username: Joi.string().trim().lowercase().min(2).max(50).required(),
  passwordHash: Joi.string().required(),
  name: Joi.string().trim().min(1).max(80).required(),
  createdAt: Joi.date().default(() => new Date())
})

const createNew = async (data) => {
  const validData = await USER_SCHEMA.validateAsync(data, { abortEarly: false })
  return await GET_DB().collection(USER_COLLECTION_NAME).insertOne(validData)
}

const findByUsername = async (username) => {
  return await GET_DB().collection(USER_COLLECTION_NAME).findOne({
    username: String(username || '').trim().toLowerCase()
  })
}

const updateByUsername = async (username, data) => {
  return await GET_DB().collection(USER_COLLECTION_NAME).updateOne(
    { username: String(username || '').trim().toLowerCase() },
    { $set: data }
  )
}

const ensureIndexes = async () => {
  await GET_DB().collection(USER_COLLECTION_NAME).createIndex({ username: 1 }, { unique: true })
}

export const userModel = {
  USER_COLLECTION_NAME,
  createNew,
  findByUsername,
  updateByUsername,
  ensureIndexes
}
