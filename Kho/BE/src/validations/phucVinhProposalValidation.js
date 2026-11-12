import Joi from 'joi'
import { validateRequest } from '~/validations/validateRequest'

const line = Joi.object({
  itemName: Joi.string().trim().min(1).max(200).required().messages({
    'string.empty': 'Nhập tên vật tư',
    'any.required': 'Nhập tên vật tư'
  }),
  unit: Joi.string().trim().allow('').max(50).default(''),
  quantity: Joi.number().greater(0).required().messages({
    'number.base': 'Nhập số lượng',
    'number.greater': 'Số lượng phải lớn hơn 0',
    'any.required': 'Nhập số lượng'
  }),
  price: Joi.number().integer().min(0).allow(null).default(null).messages({
    'number.base': 'Nhập đơn giá',
    'number.integer': 'Đơn giá phải là số nguyên',
    'number.min': 'Đơn giá không được âm'
  }),
  stock: Joi.number().integer().min(0).allow(null).default(null).messages({
    'number.base': 'Nhập tồn kho',
    'number.integer': 'Tồn kho phải là số nguyên',
    'number.min': 'Tồn kho không được âm'
  }),
  supplier: Joi.string().trim().allow('').max(120).default(''),
  receiver: Joi.string().trim().allow('').max(120).default('')
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

export const phucVinhProposalValidation = {
  save: validateRequest(schema)
}
