import jwt from 'jsonwebtoken'
import { StatusCodes } from 'http-status-codes'
import { env } from '~/config/environment'
import ApiError from '~/utils/ApiError'

const requireSecret = () => {
  if (!env.JWT_SECRET) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Chưa cấu hình JWT_SECRET')
  }
  return env.JWT_SECRET
}

const generateToken = (payload) => {
  return jwt.sign(payload, requireSecret(), { expiresIn: '30d' })
}

const verifyToken = (token) => {
  return jwt.verify(token, requireSecret())
}

export const jwtHelper = {
  generateToken,
  verifyToken
}
