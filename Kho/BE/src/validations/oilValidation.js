import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { validateRequest } from '~/validations/validateRequest'

const km = Joi.number().integer().min(0).max(9999999).required().messages({
  'number.base': 'Km phải là số',
  'number.min': 'Km không được âm',
  'number.max': 'Km quá lớn',
  'any.required': 'Nhập km'
})

const date = Joi.string().trim().allow('').pattern(/^\d{4}-\d{2}-\d{2}$/).default('').messages({
  'string.pattern.base': 'Ngày không hợp lệ'
})

const kmSchema = Joi.object({
  km,
  date
})

const changeSchema = Joi.object({
  kind: Joi.string().valid('may', 'cau', 'so').required().messages({
    'any.only': 'Chọn dầu máy, dầu cầu hoặc dầu số',
    'any.required': 'Chọn loại dầu'
  }),
  km,
  date,
  note: Joi.string().trim().allow('').max(300).default('').messages({
    'string.max': 'Ghi chú tối đa 300 ký tự'
  })
})

const validateId = (req, res, next) => {
  if (!OBJECT_ID_RULE.test(req.params.driverId || '')) {
    next(new ApiError(StatusCodes.BAD_REQUEST, OBJECT_ID_RULE_MESSAGE))
    return
  }
  next()
}

export const oilValidation = {
  km: validateRequest(kmSchema),
  change: validateRequest(changeSchema),
  validateId
}
