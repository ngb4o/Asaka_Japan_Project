import Joi from 'joi'
import { validateRequest } from '~/validations/validateRequest'

const optionalText = Joi.string().trim().allow('', null).optional()

const createPublicSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  phone: Joi.string().trim().min(8).max(20).required(),
  email: optionalText.max(150),
  company: optionalText.max(150),
  region: optionalText.max(100),
  message: optionalText.max(2000),
  type: Joi.string().valid('contact', 'dealer').optional(),
  source: optionalText.max(50)
})

const updateSchema = Joi.object({
  status: Joi.string()
    .valid('new', 'contacted', 'qualified', 'converted', 'closed')
    .optional(),
  note: optionalText.max(1000),
  dealerId: optionalText.max(24).allow(null)
}).min(1)

export const leadValidation = {
  createPublic: validateRequest(createPublicSchema),
  update: validateRequest(updateSchema)
}
