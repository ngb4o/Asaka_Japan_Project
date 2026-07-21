import bcrypt from 'bcryptjs'
import { userModel } from '~/models/userModel'
import { tokenBlacklistModel } from '~/models/tokenBlacklistModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { jwtHelper } from '~/utils/jwt'

const resolveRole = (user) => user.role || userModel.USER_ROLES.ADMIN

const toPublicUser = (user) => ({
  id: user._id.toString(),
  email: user.email,
  username: user.username,
  avatar: user.avatar ?? null,
  role: resolveRole(user),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt ?? null
})

const register = async () => {
  throw new ApiError(
    StatusCodes.FORBIDDEN,
    'Đăng ký công khai đã bị tắt. Vui lòng liên hệ quản trị viên.'
  )
}

const login = async (reqBody) => {
  const account = String(reqBody.account || reqBody.email || '').trim()
  if (!account) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Tài khoản hoặc mật khẩu không đúng!')
  }

  const user =
    (await userModel.findOneByUsername(account)) ||
    (await userModel.findOneByEmail(account))

  if (!user || user._destroy) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Tài khoản hoặc mật khẩu không đúng!')
  }

  const isPasswordValid = await bcrypt.compare(reqBody.password, user.password)
  if (!isPasswordValid) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Tài khoản hoặc mật khẩu không đúng!')
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

  return toPublicUser(user)
}

const getUserById = async (targetUserId) => {
  const user = await userModel.findOneById(targetUserId)
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng!')
  }

  return toPublicUser(user)
}

const getList = async () => {
  const result = await userModel.findMany({ limit: 200, skip: 0 })
  return {
    items: result.items.map((user) => toPublicUser(user)),
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
  login,
  logout,
  getProfile,
  getUserById,
  getList,
  updateRole
}
