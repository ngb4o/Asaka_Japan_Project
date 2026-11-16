import Joi from 'joi'
import { validateRequest } from '~/validations/validateRequest'

const schema = Joi.object({
  reportDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Nhập ngày',
    'any.required': 'Nhập ngày'
  }),
  fullName: Joi.string().trim().min(1).max(80).required().messages({
    'string.empty': 'Nhập họ và tên',
    'any.required': 'Nhập họ và tên'
  }),
  department: Joi.string().trim().min(1).max(80).required().messages({
    'string.empty': 'Nhập bộ phận',
    'any.required': 'Nhập bộ phận'
  }),
  content: Joi.string().trim().min(1).max(500).required().messages({
    'string.empty': 'Nhập nội dung tạm ứng',
    'any.required': 'Nhập nội dung tạm ứng'
  }),
  amount: Joi.number().integer().min(1).max(999_999_999_999).required().messages({
    'number.base': 'Nhập số tiền',
    'number.integer': 'Số tiền phải là số nguyên',
    'number.min': 'Số tiền phải lớn hơn 0',
    'number.max': 'Số tiền quá lớn',
    'any.required': 'Nhập số tiền'
  }),
  amountWords: Joi.string().trim().min(1).max(300).required().messages({
    'string.empty': 'Nhập số tiền bằng chữ',
    'any.required': 'Nhập số tiền bằng chữ'
  }),
  bankAccount: Joi.string().trim().min(1).max(160).required().messages({
    'string.empty': 'Nhập số tài khoản',
    'any.required': 'Nhập số tài khoản'
  })
})

export const advanceProposalValidation = {
  save: validateRequest(schema)
}
