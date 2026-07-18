import jwt from 'jsonwebtoken'
import { env } from '~/config/environment'

const generateToken = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn })
}

const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET)
}

export const jwtHelper = {
  generateToken,
  verifyToken
}
