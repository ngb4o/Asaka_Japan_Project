import { StatusCodes } from 'http-status-codes'
import { authService } from '~/services/authService'
import { userModel } from '~/models/userModel'

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body)

    res.status(StatusCodes.OK).json({
      message: 'Đăng nhập thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const me = async (req, res, next) => {
  try {
    const user = await userModel.findByUsername(req.user.username)
    if (!user) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Cần đăng nhập' })
      return
    }

    res.status(StatusCodes.OK).json({
      message: 'Phiên đăng nhập còn hiệu lực',
      data: authService.publicUser(user)
    })
  } catch (error) {
    next(error)
  }
}

export const authController = {
  login,
  me
}
