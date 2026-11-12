import Joi from 'joi'
import { validateRequest } from '~/validations/validateRequest'

const reading = (label) => Joi.number().integer().min(0).required().messages({
  'number.base': `Nhập ${label}`,
  'number.integer': `${label} phải là số nguyên`,
  'number.min': `${label} không được âm`,
  'any.required': `Nhập ${label}`
})

const schema = Joi.object({
  reportDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Nhập ngày',
    'any.required': 'Nhập ngày'
  }),
  period: Joi.string().trim().min(1).max(80).required().messages({
    'string.empty': 'Nhập kỳ phiếu báo',
    'any.required': 'Nhập kỳ phiếu báo'
  }),
  subject: Joi.string().trim().min(1).max(200).required().messages({
    'string.empty': 'Nhập nội dung V/v',
    'any.required': 'Nhập nội dung V/v'
  }),
  content: Joi.string().trim().min(1).max(800).required().messages({
    'string.empty': 'Nhập nội dung đề xuất',
    'any.required': 'Nhập nội dung đề xuất'
  }),
  paymentTitle: Joi.string().trim().min(1).max(200).required().messages({
    'string.empty': 'Nhập nội dung thanh toán',
    'any.required': 'Nhập nội dung thanh toán'
  }),
  amountWords: Joi.string().trim().min(1).max(200).required().messages({
    'string.empty': 'Nhập số tiền bằng chữ',
    'any.required': 'Nhập số tiền bằng chữ'
  }),
  electricStart: reading('số đầu điện'),
  electricEnd: reading('số cuối điện'),
  electricPrice: reading('đơn giá điện'),
  electricNote: Joi.string().trim().allow('').max(300).default(''),
  waterStart: reading('số đầu nước'),
  waterEnd: reading('số cuối nước'),
  waterPrice: reading('đơn giá nước'),
  waterNote: Joi.string().trim().allow('').max(300).default(''),
  sanitationFee: reading('tiền nước vệ sinh'),
  sanitationNote: Joi.string().trim().allow('').max(300).default(''),
  internetFee: reading('tiền internet'),
  internetNote: Joi.string().trim().allow('').max(300).default('')
}).custom((value, helpers) => {
  if (value.electricEnd < value.electricStart) return helpers.message('Số cuối điện phải lớn hơn hoặc bằng số đầu')
  if (value.waterEnd < value.waterStart) return helpers.message('Số cuối nước phải lớn hơn hoặc bằng số đầu')
  return value
})

export const utilityProposalValidation = {
  save: validateRequest(schema)
}
