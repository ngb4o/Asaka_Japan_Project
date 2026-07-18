import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'

// Tên collection trong MongoDB
const TOKEN_BLACKLIST_COLLECTION_NAME = 'token_blacklist'

// Schema validation cho Token Blacklist
const TOKEN_BLACKLIST_SCHEMA = Joi.object({
  token: Joi.string().required().trim().strict(),
  userId: Joi.string().required().trim().strict(),
  createdAt: Joi.date().default(() => new Date())
})

/**
 * Validate dữ liệu trước khi thêm token vào blacklist
 * @param {Object} data - Dữ liệu token cần validate
 * @returns {Object} - Dữ liệu đã được validate và format
 */
const validateBeforeCreate = async (data) => {
  return await TOKEN_BLACKLIST_SCHEMA.validateAsync(data, { abortEarly: false })
}

/**
 * Thêm token vào blacklist
 * @param {Object} data - Dữ liệu token cần thêm (token, userId)
 * @returns {Object} - Kết quả insert
 */
const addToken = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    return await GET_DB().collection(TOKEN_BLACKLIST_COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Kiểm tra token có trong blacklist không
 * @param {string} token - Token cần kiểm tra
 * @returns {boolean} - true nếu token có trong blacklist, false nếu không
 */
const isTokenBlacklisted = async (token) => {
  try {
    const blacklistedToken = await GET_DB()
      .collection(TOKEN_BLACKLIST_COLLECTION_NAME)
      .findOne({ token })
    return !!blacklistedToken
  } catch (error) {
    throw new Error(error)
  }
}

export const tokenBlacklistModel = {
  TOKEN_BLACKLIST_COLLECTION_NAME,
  TOKEN_BLACKLIST_SCHEMA,
  addToken,
  isTokenBlacklisted
}

