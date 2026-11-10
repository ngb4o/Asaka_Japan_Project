import Joi from 'joi'
import { validateRequest } from '~/validations/validateRequest'

const loginSchema = Joi.object({
  username: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Tên đăng nhập là bắt buộc',
    'any.required': 'Tên đăng nhập là bắt buộc',
    'string.min': 'Tên đăng nhập tối thiểu 2 ký tự'
  }),
  password: Joi.string().min(6).max(100).required().messages({
    'string.empty': 'Mật khẩu là bắt buộc',
    'any.required': 'Mật khẩu là bắt buộc',
    'string.min': 'Mật khẩu tối thiểu 6 ký tự'
  })
})

export const authValidation = {
  login: validateRequest(loginSchema)
}
