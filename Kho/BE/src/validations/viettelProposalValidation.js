import Joi from 'joi'
import { validateRequest } from '~/validations/validateRequest'

const line = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Nhập ngày gửi',
    'any.required': 'Nhập ngày gửi'
  }),
  receiver: Joi.string().trim().min(1).max(200).required().messages({
    'string.empty': 'Nhập địa chỉ người nhận',
    'any.required': 'Nhập địa chỉ người nhận'
  }),
  fee: Joi.number().integer().min(0).required().messages({
    'number.base': 'Nhập phí cước',
    'number.integer': 'Phí cước phải là số nguyên',
    'number.min': 'Phí cước không được âm',
    'any.required': 'Nhập phí cước'
  }),
  note: Joi.string().trim().allow('').max(300).default('')
})

const schema = Joi.object({
  reportDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Nhập ngày',
    'any.required': 'Nhập ngày'
  }),
  subject: Joi.string().trim().min(1).max(200).required().messages({
    'string.empty': 'Nhập nội dung V/v',
    'any.required': 'Nhập nội dung V/v'
  }),
  content: Joi.string().trim().min(1).max(800).required().messages({
    'string.empty': 'Nhập nội dung đề xuất',
    'any.required': 'Nhập nội dung đề xuất'
  }),
  lines: Joi.array().items(line).min(1).max(30).required().messages({
    'array.min': 'Nhập ít nhất một dòng',
    'array.max': 'Một báo cáo tối đa 30 dòng'
  })
})

export const viettelProposalValidation = {
  save: validateRequest(schema)
}
