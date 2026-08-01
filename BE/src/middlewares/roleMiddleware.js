import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { userModel } from '~/models/userModel'
import { primaryRole, resolveRoles } from '~/utils/roles'

/**
 * Attach roles onto request after JWT verify.
 * Users without a valid role get empty roles[] (no privileges).
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

    const roles = resolveRoles(user)
    req.userRoles = roles
    req.userRole = primaryRole(roles)
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Restrict route to one or more roles.
 * Allowed if user has admin OR any listed role (any-of).
 * Usage: requireRoles('sales', 'warehouse')
 */
export const requireRoles = (...roles) => {
  return (req, res, next) => {
    const userRoles = Array.isArray(req.userRoles)
      ? req.userRoles
      : req.userRole
        ? [req.userRole]
        : []

    if (!userRoles.length) {
      return next(new ApiError(StatusCodes.FORBIDDEN, 'Thiếu thông tin vai trò!'))
    }

    if (
      userRoles.includes(userModel.USER_ROLES.ADMIN) ||
      roles.some((role) => userRoles.includes(role))
    ) {
      return next()
    }

    return next(
      new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền thực hiện thao tác này!')
    )
  }
}
