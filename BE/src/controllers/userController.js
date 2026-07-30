import { StatusCodes } from 'http-status-codes'
import { userService } from '~/services/userService'

const register = async (req, res, next) => {
  try {
    const result = await userService.register(req.body)

    res.status(StatusCodes.CREATED).json({
      message: 'Đăng ký thành công!',
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
      message: 'Đăng nhập thành công!',
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
      message: 'Đăng xuất thành công!',
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
      message: 'Lấy thông tin tài khoản thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getUserById = async (req, res, next) => {
  try {
    const targetUserId = req.params.id
    const result = await userService.getUserById(targetUserId)

    res.status(StatusCodes.OK).json({
      message: 'Lấy hồ sơ người dùng thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getList = async (req, res, next) => {
  try {
    const result = await userService.getList()

    res.status(StatusCodes.OK).json({
      message: 'Lấy danh sách người dùng thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const createByAdmin = async (req, res, next) => {
  try {
    const result = await userService.createByAdmin(req.body)

    res.status(StatusCodes.CREATED).json({
      message: 'Tạo tài khoản thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const updatePassword = async (req, res, next) => {
  try {
    await userService.updatePassword(req.params.id, req.body.password)

    res.status(StatusCodes.OK).json({
      message: 'Đặt lại mật khẩu thành công!',
      data: true
    })
  } catch (error) {
    next(error)
  }
}

const changeOwnPassword = async (req, res, next) => {
  try {
    await userService.changeOwnPassword(
      req.userId,
      req.body.currentPassword,
      req.body.newPassword
    )

    res.status(StatusCodes.OK).json({
      message: 'Đổi mật khẩu thành công!',
      data: true
    })
  } catch (error) {
    next(error)
  }
}

const updateRole = async (req, res, next) => {
  try {
    const result = await userService.updateRole(
      req.params.id,
      req.body.role,
      req.userId
    )

    res.status(StatusCodes.OK).json({
      message: 'Cập nhật quyền người dùng thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteByAdmin = async (req, res, next) => {
  try {
    const result = await userService.deleteByAdmin(req.params.id, req.userId)

    res.status(StatusCodes.OK).json({
      message: 'Đã xóa tài khoản!',
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
  getUserById,
  getList,
  createByAdmin,
  updatePassword,
  changeOwnPassword,
  updateRole,
  deleteByAdmin
}