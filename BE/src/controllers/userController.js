import { StatusCodes } from 'http-status-codes'
import { userService } from '~/services/userService'

const register = async (req, res, next) => {
  try {
    const result = await userService.register(req.body)

    res.status(StatusCodes.CREATED).json({
      message: 'Register successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const login = async (req, res, next) => {
  try {
    const result = await userService.login(req.body)

    res.status(StatusCodes.OK).json({
      message: 'Login successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const logout = async (req, res, next) => {
  try {
    // Lấy token từ header Authorization
    const authHeader = req.headers.authorization
    const token = authHeader.substring(7) // Bỏ phần "Bearer "

    // req.userId được set bởi verifyToken middleware
    const result = await userService.logout(token, req.userId)

    res.status(StatusCodes.OK).json({
      message: 'Logout successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getProfile = async (req, res, next) => {
  try {
    // req.userId được set bởi verifyToken middleware
    const result = await userService.getProfile(req.userId)

    res.status(StatusCodes.OK).json({
      message: 'Get profile successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getUserById = async (req, res, next) => {
  try {
    // Lấy userId từ route params
    const targetUserId = req.params.id

    // req.userId được set bởi verifyToken middleware (user đang đăng nhập)
    // Có thể xem profile của user khác nếu đã đăng nhập
    const result = await userService.getUserById(targetUserId)

    res.status(StatusCodes.OK).json({
      message: 'Get user profile successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const userController = {
  register,
  login,
  logout,
  getProfile,
  getUserById
}