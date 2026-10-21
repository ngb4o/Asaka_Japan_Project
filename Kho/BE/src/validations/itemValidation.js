import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { validateRequest } from '~/validations/validateRequest'

const nameField = Joi.string().trim().min(2).max(200).messages({
  'string.min': 'Tên sản phẩm tối thiểu 2 ký tự',
  'string.max': 'Tên sản phẩm tối đa 200 ký tự',
  'string.empty': 'Tên sản phẩm là bắt buộc',
  'any.required': 'Tên sản phẩm là bắt buộc'
})

const quantityField = Joi.number().min(0).messages({
  'number.base': 'Số lượng phải là số',
  'number.min': 'Số lượng không được âm',
  'any.required': 'Số lượng là bắt buộc'
})

const columnField = Joi.number().integer().min(1).max(9999).allow(null).empty('').messages({
  'number.base': 'Cột phải là số nguyên',
  'number.integer': 'Cột phải là số nguyên',
  'number.min': 'Cột phải từ 1 trở lên',
  'number.max': 'Cột tối đa 9999',
  'any.required': 'Cột là bắt buộc'
})

const createSchema = Joi.object({
  name: nameField.required(),
  quantity: quantityField.required(),
  column: columnField.optional().default(null)
})

const updateSchema = Joi.object({
  name: nameField.optional(),
  quantity: quantityField.optional(),
  column: columnField.optional()
}).min(1)

export const itemValidation = {
  createNew: validateRequest(createSchema),
  update: validateRequest(updateSchema),
  validateId: (req, res, next) => {
    if (!OBJECT_ID_RULE.test(req.params.id || '')) {
      next(new ApiError(StatusCodes.BAD_REQUEST, OBJECT_ID_RULE_MESSAGE))
      return
    }

    next()
  }
}
