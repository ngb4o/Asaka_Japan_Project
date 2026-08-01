import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { EMAIL_JOI_OPTIONS } from '~/utils/validators'

// Tên collection trong MongoDB
const USER_COLLECTION_NAME = 'users'

// Schema validation cho User (dùng Joi để validate dữ liệu trước khi lưu vào DB)
const USER_COLLECTION_SCHEMA = Joi.object({
  email: Joi.string().required().email(EMAIL_JOI_OPTIONS).trim().strict(),

  password: Joi.string().required().min(6).trim().strict(),

  username: Joi.string().required().min(3).max(50).trim().strict(),

  avatar: Joi.string().default(null),

  role: Joi.string()
    .valid('admin', 'sales', 'warehouse', 'accountant')
    .default('sales'),

  roles: Joi.array()
    .items(Joi.string().valid('admin', 'sales', 'warehouse', 'accountant'))
    .min(1)
    .default(['sales']),

  createdAt: Joi.date().default(() => new Date()),
  updatedAt: Joi.date().default(null),
  _destroy: Joi.boolean().default(false)
})

const USER_ROLES = {
  ADMIN: 'admin',
  SALES: 'sales',
  WAREHOUSE: 'warehouse',
  ACCOUNTANT: 'accountant'
}

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
    const validData = await validateBeforeCreate(data)
    // Keep role + roles in sync
    if (Array.isArray(validData.roles) && validData.roles.length) {
      validData.role = validData.roles[0]
    } else if (validData.role) {
      validData.roles = [validData.role]
    }

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

const findOneByUsername = async (username) => {
  try {
    return await GET_DB().collection(USER_COLLECTION_NAME).findOne({ username })
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

const findMany = async (options = {}) => {
  const { limit = 100, skip = 0, sort = { createdAt: -1 } } = options

  const findQuery = { _destroy: { $ne: true } }

  const items = await GET_DB()
    .collection(USER_COLLECTION_NAME)
    .find(findQuery, { projection: { password: 0 } })
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .toArray()

  const total = await GET_DB()
    .collection(USER_COLLECTION_NAME)
    .countDocuments(findQuery)

  return { items, total, limit, skip }
}

const updateRoles = async (id, roles) => {
  const nextRoles = Array.isArray(roles) && roles.length ? roles : ['sales']
  return await GET_DB()
    .collection(USER_COLLECTION_NAME)
    .updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          roles: nextRoles,
          role: nextRoles[0],
          updatedAt: new Date()
        }
      }
    )
}

/** @deprecated prefer updateRoles — kept for callers passing a single role */
const updateRole = async (id, role) => updateRoles(id, [role])

const updatePassword = async (id, password) => {
  return await GET_DB()
    .collection(USER_COLLECTION_NAME)
    .updateOne(
      { _id: new ObjectId(id) },
      { $set: { password, updatedAt: new Date() } }
    )
}

const softDelete = async (id) => {
  return await GET_DB()
    .collection(USER_COLLECTION_NAME)
    .updateOne(
      { _id: new ObjectId(id), _destroy: { $ne: true } },
      { $set: { _destroy: true, updatedAt: new Date() } }
    )
}

const deleteOne = async (id) => {
  return await GET_DB()
    .collection(USER_COLLECTION_NAME)
    .deleteOne({ _id: new ObjectId(id) })
}

const countByRole = async (role) => {
  return await GET_DB()
    .collection(USER_COLLECTION_NAME)
    .countDocuments({
      _destroy: { $ne: true },
      $or: [{ roles: role }, { role }]
    })
}

const countActive = async () => {
  return await GET_DB()
    .collection(USER_COLLECTION_NAME)
    .countDocuments({ _destroy: { $ne: true } })
}

export const userModel = {
  USER_COLLECTION_NAME,
  USER_COLLECTION_SCHEMA,
  USER_ROLES,
  createNew,
  findOneByEmail,
  findOneByUsername,
  findOneById,
  checkEmailExists,
  findMany,
  updateRole,
  updateRoles,
  updatePassword,
  softDelete,
  deleteOne,
  countByRole,
  countActive
}