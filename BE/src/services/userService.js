import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'
import { userModel } from '~/models/userModel'
import { employeeModel } from '~/models/employeeModel'
import { tokenBlacklistModel } from '~/models/tokenBlacklistModel'
import { GET_DB } from '~/config/mongodb'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { jwtHelper } from '~/utils/jwt'

const resolveRole = (user) => user.role || userModel.USER_ROLES.ADMIN

const generateTemporaryPassword = (length = 10) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.randomBytes(length)
  let password = ''
  for (let i = 0; i < length; i += 1) {
    password += alphabet[bytes[i] % alphabet.length]
  }
  return password
}

const slugUsername = (value) => {
  const base = String(value || 'user')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 40)
  return base.length >= 3 ? base : `user${base}`
}

const ensureUniqueUsername = async (preferred) => {
  let candidate = slugUsername(preferred)
  if (candidate.length < 3) candidate = `user${Date.now().toString().slice(-6)}`

  let suffix = 0
  while (await userModel.findOneByUsername(candidate)) {
    suffix += 1
    candidate = `${slugUsername(preferred).slice(0, 40)}${suffix}`
  }
  return candidate
}

const loadEmployeeByUserIds = async (userIds) => {
  if (!userIds.length) return new Map()
  const docs = await GET_DB()
    .collection(employeeModel.EMPLOYEE_COLLECTION_NAME)
    .find({
      userId: { $in: userIds.map((id) => new ObjectId(id)) },
      _destroy: false
    })
    .toArray()

  return new Map(
    docs.map((employee) => [
      employee.userId.toString(),
      {
        id: employee._id.toString(),
        fullName: employee.fullName,
        code: employee.code
      }
    ])
  )
}

const toPublicUser = (user, employee = null) => ({
  id: user._id.toString(),
  email: user.email,
  username: user.username,
  avatar: user.avatar ?? null,
  role: resolveRole(user),
  employeeId: employee?.id || null,
  employeeName: employee?.fullName || null,
  employeeCode: employee?.code || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt ?? null
})

const register = async () => {
  throw new ApiError(
    StatusCodes.FORBIDDEN,
    'Đăng ký công khai đã bị tắt. Vui lòng liên hệ quản trị viên.'
  )
}

const createByAdmin = async (reqBody) => {
  const employee = await employeeModel.findOneById(reqBody.employeeId)
  if (!employee) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy nhân viên!')
  }
  if (employee.userId) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'Nhân viên này đã được gắn tài khoản CRM!'
    )
  }

  const email = String(reqBody.email || employee.email || '')
    .trim()
    .toLowerCase()
  if (!email) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Nhân viên chưa có email. Vui lòng nhập email để cấp tài khoản.'
    )
  }

  if (await userModel.findOneByEmail(email)) {
    throw new ApiError(StatusCodes.CONFLICT, 'Email đã được sử dụng!')
  }

  const temporaryPassword =
    String(reqBody.password || '').trim() || generateTemporaryPassword()
  const username = await ensureUniqueUsername(
    employee.code || employee.fullName || email.split('@')[0]
  )

  const created = await userModel.createNew({
    email,
    username,
    password: await bcrypt.hash(temporaryPassword, 10),
    role: reqBody.role || userModel.USER_ROLES.SALES
  })

  const userId = created.insertedId.toString()
  const employeePatch = { userId }
  if (!String(employee.email || '').trim()) {
    employeePatch.email = email
  }
  await employeeModel.update(reqBody.employeeId, employeePatch)

  const user = await getUserById(userId)
  return {
    ...user,
    temporaryPassword
  }
}

const updatePassword = async (targetUserId, password) => {
  const user = await userModel.findOneById(targetUserId)
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng!')
  }

  await userModel.updatePassword(targetUserId, await bcrypt.hash(password, 10))
  return true
}

const changeOwnPassword = async (userId, currentPassword, newPassword) => {
  const user = await userModel.findOneById(userId)
  if (!user || user._destroy) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng!')
  }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Mật khẩu hiện tại không đúng!')
  }

  if (currentPassword === newPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Mật khẩu mới phải khác mật khẩu hiện tại!'
    )
  }

  await userModel.updatePassword(userId, await bcrypt.hash(newPassword, 10))
  return true
}

const login = async (reqBody) => {
  const email = String(reqBody.email || '').trim().toLowerCase()
  if (!email) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Email hoặc mật khẩu không đúng!')
  }

  const user = await userModel.findOneByEmail(email)

  if (!user || user._destroy) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Email hoặc mật khẩu không đúng!')
  }

  const isPasswordValid = await bcrypt.compare(reqBody.password, user.password)
  if (!isPasswordValid) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Email hoặc mật khẩu không đúng!')
  }

  const token = jwtHelper.generateToken({
    userId: user._id.toString(),
    email: user.email,
    role: resolveRole(user)
  })

  return {
    userId: user._id.toString(),
    token
  }
}

const logout = async (token, userId) => {
  await tokenBlacklistModel.addToken({
    token,
    userId
  })

  return true
}

const getProfile = async (userId) => {
  const user = await userModel.findOneById(userId)
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng!')
  }

  const employeeMap = await loadEmployeeByUserIds([userId])
  return toPublicUser(user, employeeMap.get(userId) || null)
}

const getUserById = async (targetUserId) => {
  const user = await userModel.findOneById(targetUserId)
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng!')
  }

  const employeeMap = await loadEmployeeByUserIds([targetUserId])
  return toPublicUser(user, employeeMap.get(targetUserId) || null)
}

const getList = async () => {
  const result = await userModel.findMany({ limit: 200, skip: 0 })
  const userIds = result.items.map((user) => user._id.toString())
  const employeeMap = await loadEmployeeByUserIds(userIds)

  return {
    items: result.items.map((user) =>
      toPublicUser(user, employeeMap.get(user._id.toString()) || null)
    ),
    total: result.total
  }
}

const updateRole = async (targetUserId, role, actorUserId) => {
  if (!Object.values(userModel.USER_ROLES).includes(role)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Vai trò không hợp lệ!')
  }

  const user = await userModel.findOneById(targetUserId)
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng!')
  }

  if (targetUserId === actorUserId && role !== userModel.USER_ROLES.ADMIN) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Không thể tự gỡ quyền quản trị của chính bạn!'
    )
  }

  await userModel.updateRole(targetUserId, role)
  return await getUserById(targetUserId)
}

export const userService = {
  register,
  createByAdmin,
  updatePassword,
  changeOwnPassword,
  login,
  logout,
  getProfile,
  getUserById,
  getList,
  updateRole
}
