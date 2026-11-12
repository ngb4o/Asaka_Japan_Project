import Joi from 'joi'
import { validateRequest } from '~/validations/validateRequest'

const line = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Nhập ngày sửa chữa',
    'any.required': 'Nhập ngày sửa chữa'
  }),
  plate: Joi.string().trim().allow('').max(120).default(''),
  itemName: Joi.string().trim().min(1).max(200).required().messages({
    'string.empty': 'Nhập danh mục',
    'any.required': 'Nhập danh mục'
  }),
  unit: Joi.string().trim().allow('').max(50).default(''),
  quantity: Joi.number().greater(0).required().messages({
    'number.base': 'Nhập số lượng',
    'number.greater': 'Số lượng phải lớn hơn 0',
    'any.required': 'Nhập số lượng'
  }),
  price: Joi.number().integer().min(0).required().messages({
    'number.base': 'Nhập đơn giá',
    'number.integer': 'Đơn giá phải là số nguyên',
    'number.min': 'Đơn giá không được âm',
    'any.required': 'Nhập đơn giá'
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

export const tireProposalValidation = {
  save: validateRequest(schema)
}
