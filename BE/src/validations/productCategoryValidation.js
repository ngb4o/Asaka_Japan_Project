import Joi from 'joi'
import { OBJECT_ID_RULE } from '~/utils/validators'
import { validateRequest } from '~/validations/validateRequest'

const optionalText = Joi.string().trim().allow('', null).optional()

const categoryIdRule = Joi.string()
  .pattern(OBJECT_ID_RULE)
  .message('Invalid category id')

const createSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  description: optionalText.max(500),
  status: Joi.string().valid('active', 'inactive').optional()
})

const updateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  description: optionalText.max(500),
  status: Joi.string().valid('active', 'inactive').optional()
}).min(1)

export const productCategoryValidation = {
  createNew: validateRequest(createSchema),
  update: validateRequest(updateSchema)
}
