import Joi from 'joi'
import { validateRequest } from '~/validations/validateRequest'

const optionalText = Joi.string().trim().allow('', null).optional()

const createSchema = Joi.object({
  title: Joi.string().trim().min(2).max(300).required(),
  content: Joi.string().trim().min(2).max(50000).required(),
  image: optionalText.max(500),
  displayOrder: Joi.number().integer().min(0).optional(),
  status: Joi.string().valid('active', 'inactive').optional()
})

const updateSchema = Joi.object({
  title: Joi.string().trim().min(2).max(300).optional(),
  content: Joi.string().trim().min(2).max(50000).optional(),
  image: optionalText.max(500),
  displayOrder: Joi.number().integer().min(0).optional(),
  status: Joi.string().valid('active', 'inactive').optional()
}).min(1)

export const newsValidation = {
  createNew: validateRequest(createSchema),
  update: validateRequest(updateSchema)
}
