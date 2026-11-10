import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { validateRequest } from '~/validations/validateRequest'

const createSchema = Joi.object({
  type: Joi.string().valid('in', 'out').required().messages({
    'any.only': 'Loại phiếu phải là nhập hoặc xuất',
    'any.required': 'Loại phiếu là bắt buộc'
  }),
  quantity: Joi.number().greater(0).max(1000000).required().messages({
    'number.base': 'Số lượng phải là số',
    'number.greater': 'Số lượng phải lớn hơn 0',
    'number.max': 'Số lượng quá lớn',
    'any.required': 'Số lượng là bắt buộc'
  }),
  note: Joi.string().trim().allow('').max(300).default('').messages({
    'string.max': 'Ghi chú tối đa 300 ký tự'
  })
})

const validateItemId = (req, res, next) => {
  if (!OBJECT_ID_RULE.test(req.params.id || '')) {
    next(new ApiError(StatusCodes.BAD_REQUEST, OBJECT_ID_RULE_MESSAGE))
    return
  }

  next()
}

export const movementValidation = {
  create: validateRequest(createSchema),
  validateItemId
}
