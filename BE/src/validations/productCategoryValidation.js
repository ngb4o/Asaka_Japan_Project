import Joi from 'joi'
import { OBJECT_ID_RULE } from '~/utils/validators'
import { validateRequest } from '~/validations/validateRequest'

const optionalText = Joi.string().trim().allow('', null).optional()

const pestTypeItemSchema = Joi.object({
  value: Joi.string().trim().min(1).max(100).required(),
  label: Joi.string().trim().min(1).max(200).required()
})

const createSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  description: optionalText.max(500),
  pestTypes: Joi.array().items(pestTypeItemSchema).default([]),
  status: Joi.string().valid('active', 'inactive').optional(),
  order: Joi.number().integer().min(0).optional()
})

const updateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  description: optionalText.max(500),
  pestTypes: Joi.array().items(pestTypeItemSchema).optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
  order: Joi.number().integer().min(0).optional()
}).min(1)

const reorderSchema = Joi.object({
  /** Mảng id theo thứ tự hiển thị mong muốn. Index trong mảng chính là `order`. */
  ids: Joi.array()
    .items(Joi.string().pattern(OBJECT_ID_RULE).message('Invalid category id'))
    .min(1)
    .required()
})

export const productCategoryValidation = {
  createNew: validateRequest(createSchema),
  update: validateRequest(updateSchema),
  reorder: validateRequest(reorderSchema)
}
