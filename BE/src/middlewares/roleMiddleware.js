import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { userModel } from '~/models/userModel'

/**
 * Attach role onto request after JWT verify.
 * Existing users without role default to admin (backward compatible).
 */
export const attachUserRole = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Chưa xác thực!')
    }

    const user = await userModel.findOneById(req.userId)
    if (!user || user._destroy) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Không tìm thấy người dùng!')
    }

    req.userRole = user.role || userModel.USER_ROLES.ADMIN
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Restrict route to one or more roles. Admin always allowed.
 * Usage: requireRoles('sales', 'warehouse')
 */
export const requireRoles = (...roles) => {
  return (req, res, next) => {
    const role = req.userRole

    if (!role) {
      return next(new ApiError(StatusCodes.FORBIDDEN, 'Thiếu thông tin vai trò!'))
    }

    if (role === userModel.USER_ROLES.ADMIN || roles.includes(role)) {
      return next()
    }

    return next(new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền thực hiện thao tác này!'))
  }
}
