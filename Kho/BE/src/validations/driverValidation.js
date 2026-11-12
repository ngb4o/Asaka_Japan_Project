import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { validateRequest } from '~/validations/validateRequest'

const text = (max, label) => Joi.string().trim().allow('').max(max).messages({
  'string.max': `${label} tối đa ${max} ký tự`
})

const bodySchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required().messages({
    'string.min': 'Tên lái xe tối thiểu 2 ký tự',
    'string.empty': 'Tên lái xe là bắt buộc',
    'any.required': 'Tên lái xe là bắt buộc'
  }),
  phone: text(20, 'Số điện thoại'),
  plate: text(20, 'Biển số đầu'),
  mooc: text(20, 'Biển số mooc'),
  note: text(300, 'Ghi chú')
})

const updateSchema = bodySchema.fork(['name'], (field) => field.optional()).min(1)

export const driverValidation = {
  createNew: validateRequest(bodySchema),
  update: validateRequest(updateSchema),
  validateId: (req, res, next) => {
    if (!OBJECT_ID_RULE.test(req.params.id || '')) {
      next(new ApiError(StatusCodes.BAD_REQUEST, OBJECT_ID_RULE_MESSAGE))
      return
    }
    next()
  }
}
