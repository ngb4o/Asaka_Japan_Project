import Joi from 'joi'
import { OBJECT_ID_RULE } from '~/utils/validators'
import { validateRequest } from '~/validations/validateRequest'

const optionalText = Joi.string().trim().allow('', null).optional()

const categoryIdRule = Joi.string()
  .pattern(OBJECT_ID_RULE)
  .message('Invalid category id')

const createSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required(),
  categoryId: categoryIdRule.required(),
  price: Joi.number().min(0).required(),
  sku: optionalText.max(50),
  description: optionalText.max(20000),
  shortDescription: optionalText.max(300),
  unit: optionalText.max(30),
  unitsPerCase: Joi.number().integer().min(1).optional(),
  costPrice: Joi.number().min(0).optional(),
  activeIngredient: optionalText.max(200),
  packaging: optionalText.max(100),
  image: optionalText.max(500),
  images: Joi.array().items(Joi.string().trim().max(500)).max(5).optional(),
  displayOrder: Joi.number().integer().min(0).optional(),
  status: Joi.string().valid('active', 'inactive').optional()
})

const updateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).optional(),
  categoryId: categoryIdRule.optional(),
  price: Joi.number().min(0).optional(),
  sku: optionalText.max(50),
  description: optionalText.max(20000),
  shortDescription: optionalText.max(300),
  unit: optionalText.max(30),
  unitsPerCase: Joi.number().integer().min(1).optional(),
  costPrice: Joi.number().min(0).optional(),
  activeIngredient: optionalText.max(200),
  packaging: optionalText.max(100),
  image: optionalText.max(500),
  images: Joi.array().items(Joi.string().trim().max(500)).max(5).optional(),
  displayOrder: Joi.number().integer().min(0).optional(),
  status: Joi.string().valid('active', 'inactive').optional()
}).min(1)

export const productValidation = {
  createNew: validateRequest(createSchema),
  update: validateRequest(updateSchema)
}
