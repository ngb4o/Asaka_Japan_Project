import Joi from 'joi'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { validateRequest } from '~/validations/validateRequest'

const schema = Joi.object({
  requester: Joi.string().trim().min(1).max(150).required().messages({
    'string.empty': 'Nhập người đề nghị',
    'any.required': 'Nhập người đề nghị'
  }),
  driverId: Joi.string().trim().allow('').max(50).default(''),
  driverName: Joi.string().trim().min(1).max(150).required().messages({
    'string.empty': 'Chọn lái xe',
    'any.required': 'Chọn lái xe'
  }),
  plate: Joi.string().trim().allow('').max(20).default(''),
  mooc: Joi.string().trim().allow('').max(20).default(''),
  km: Joi.number().min(0).required().messages({
    'number.base': 'Nhập số km hiện tại',
    'number.min': 'Số km không được âm',
    'any.required': 'Nhập số km hiện tại'
  }),
  lines: Joi.array().items(Joi.object({
    movementId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).required(),
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
    note: Joi.string().trim().allow('').max(300).default('')
  })).min(1).max(10).required().messages({
    'array.min': 'Chọn ít nhất một vật tư',
    'array.max': 'Một phiếu tối đa 10 vật tư'
  })
})

export const slipValidation = {
  create: validateRequest(schema)
}
