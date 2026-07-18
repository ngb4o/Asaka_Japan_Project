import bcrypt from 'bcryptjs'
import { userModel } from '~/models/userModel'
import { tokenBlacklistModel } from '~/models/tokenBlacklistModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { jwtHelper } from '~/utils/jwt'

const register = async (reqBody) => {
  const emailExists = await userModel.checkEmailExists(reqBody.email)
  if (emailExists) {
    throw new ApiError(StatusCodes.CONFLICT, 'Email already exists!')
  }

  // Hash password trước khi lưu vào database
  const hashedPassword = await bcrypt.hash(reqBody.password, 10)

  const newUser = {
    email: reqBody.email,
    password: hashedPassword,
    username: reqBody.username
  }

  const createdUser = await userModel.createNew(newUser)

  const getUser = await userModel.findOneById(createdUser.insertedId)

  // MongoDB trả về _id, không phải id
  const token = jwtHelper.generateToken({
    userId: getUser._id.toString(),
    email: getUser.email
  })

  // Chỉ trả về userId và token
  return {
    userId: getUser._id.toString(),
    token
  }
}

const login = async (reqBody) => {
  const user = await userModel.findOneByEmail(reqBody.email)
  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Email or password is incorrect!')
  }

  // So sánh password người dùng nhập với password đã hash trong database
  const isPasswordValid = await bcrypt.compare(reqBody.password, user.password)
  if (!isPasswordValid) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Email or password is incorrect!')
  }

  // MongoDB trả về _id, không phải id
  const token = jwtHelper.generateToken({
    userId: user._id.toString(),
    email: user.email
  })

  // Chỉ trả về userId và token
  return {
    userId: user._id.toString(),
    token
  }
}

const logout = async (token, userId) => {
  // Lưu token vào blacklist để không thể sử dụng lại
  await tokenBlacklistModel.addToken({
    token,
    userId
  })

  return true
}

const getProfile = async (userId) => {
  const user = await userModel.findOneById(userId)
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!')
  }

  // Trả về thông tin user (không có password)
  const userResponse = {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    avatar: user.avatar,
    createdAt: user.createdAt
  }

  return userResponse
}

const getUserById = async (targetUserId) => {
  const user = await userModel.findOneById(targetUserId)
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!')
  }

  // Trả về thông tin user (không có password)
  const userResponse = {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    avatar: user.avatar,
    createdAt: user.createdAt
  }

  return userResponse
}

export const userService = {
  register,
  login,
  logout,
  getProfile,
  getUserById
}