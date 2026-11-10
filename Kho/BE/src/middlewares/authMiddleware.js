import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { jwtHelper } from '~/utils/jwt'

export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Cần đăng nhập')
    }

    const decoded = jwtHelper.verifyToken(authHeader.slice(7))
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      name: decoded.name || decoded.username
    }
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(new ApiError(StatusCodes.UNAUTHORIZED, 'Phiên đăng nhập đã hết hạn'))
      return
    }
    next(error)
  }
}
