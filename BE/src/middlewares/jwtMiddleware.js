import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { jwtHelper } from '~/utils/jwt'
import { tokenBlacklistModel } from '~/models/tokenBlacklistModel'

/**
 * Middleware: Verify JWT token và lấy userId từ token
 * Middleware này sẽ:
 * 1. Lấy token từ header Authorization: Bearer <token>
 * 2. Verify token
 * 3. Kiểm tra token có trong blacklist không (đã logout)
 * 4. Lưu userId vào req.userId để các controller/service sử dụng
 */
export const verifyToken = async (req, res, next) => {
  try {
    // Lấy token từ header Authorization
    const authHeader = req.headers.authorization

    // Kiểm tra có header Authorization không
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Thiếu hoặc sai header xác thực!')
    }

    // Lấy token (bỏ phần "Bearer ")
    const token = authHeader.substring(7)

    // Kiểm tra token có trong blacklist không (đã logout)
    const isBlacklisted = await tokenBlacklistModel.isTokenBlacklisted(token)
    if (isBlacklisted) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Phiên đăng nhập đã bị thu hồi!')
    }

    // Verify token và lấy payload
    const decoded = jwtHelper.verifyToken(token)

    // Lưu userId vào req để các controller/service sử dụng
    req.userId = decoded.userId
    const roles = Array.isArray(decoded.roles)
      ? decoded.roles.filter(Boolean)
      : decoded.role
        ? [decoded.role]
        : []
    req.userRoles = roles
    req.userRole = decoded.role || roles[0] || null

    // Chuyển sang middleware/controller tiếp theo
    next()
  } catch (error) {
    // Nếu token không hợp lệ hoặc hết hạn
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(new ApiError(StatusCodes.UNAUTHORIZED, 'Token không hợp lệ hoặc đã hết hạn!'))
    } else {
      next(error)
    }
  }
}