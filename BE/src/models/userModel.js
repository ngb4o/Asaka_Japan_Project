import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

// Tên collection trong MongoDB
const USER_COLLECTION_NAME = 'users'

// Schema validation cho User (dùng Joi để validate dữ liệu trước khi lưu vào DB)
const USER_COLLECTION_SCHEMA = Joi.object({
  email: Joi.string().required().email().trim().strict(),

  password: Joi.string().required().min(6).trim().strict(),

  username: Joi.string().required().min(3).max(50).trim().strict(),

  avatar: Joi.string().default(null),

  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(null),
  _destroy: Joi.boolean().default(false)
})

/**
 * Validate dữ liệu trước khi tạo user mới
 * @param {Object} data - Dữ liệu user cần validate
 * @returns {Object} - Dữ liệu đã được validate và format
 */
const validateBeforeCreate = async (data) => {
  // validateAsync() : sẽ kiểm tra data có đúng schema không
  // abortEarly: false : hiển thị tất cả các lỗi, không dừng ở lỗi đầu tiên
  return await USER_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

/**
 * Tạo user mới trong database
 * @param {Object} data - Dữ liệu user cần tạo
 * @returns {Object} - Kết quả insert (có insertedId)
 */
const createNew = async (data) => {
  try {
    // Validate dữ liệu trước
    const validData = await validateBeforeCreate(data)

    // insertOne() thêm 1 document vào collection 'users'
    // Trả về object có insertedId (ID của user vừa tạo)
    return await GET_DB().collection(USER_COLLECTION_NAME).insertOne(validData)
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Tìm user theo email (dùng cho login)
 * @param {string} email - Email cần tìm
 * @returns {Object|null} - User object hoặc null nếu không tìm thấy
 */
const findOneByEmail = async (email) => {
  try {
    // findOne() tìm 1 document đầu tiên thỏa điều kiện
    // Trả về user object hoặc null
    return await GET_DB().collection(USER_COLLECTION_NAME).findOne({ email })
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Tìm user theo ID
 * @param {string} id - User ID cần tìm
 * @returns {Object|null} - User object hoặc null nếu không tìm thấy
 */
const findOneById = async (id) => {
  try {
    // ObjectId() chuyển string ID thành MongoDB ObjectId
    return await GET_DB().collection(USER_COLLECTION_NAME).findOne({ _id: new ObjectId(id) })
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Kiểm tra email đã tồn tại chưa (dùng cho register)
 * @param {string} email - Email cần kiểm tra
 * @returns {boolean} - true nếu email đã tồn tại, false nếu chưa
 */
const checkEmailExists = async (email) => {
  try {
    const user = await findOneByEmail(email)
    // Nếu tìm thấy user thì email đã tồn tại
    return !!user
  } catch (error) {
    throw new Error(error)
  }
}

export const userModel = {
  USER_COLLECTION_NAME,
  USER_COLLECTION_SCHEMA,
  createNew,
  findOneByEmail,
  findOneById,
  checkEmailExists
}