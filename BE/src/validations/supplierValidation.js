import Joi from 'joi'
import { validateRequest } from '~/validations/validateRequest'

const optionalText = Joi.string().trim().allow('', null).optional()

const createSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  contactName: optionalText.max(100),
  phone: Joi.string().trim().min(8).max(20).required(),
  email: optionalText.max(150),
  address: optionalText.max(300),
  taxCode: optionalText.max(50),
  status: Joi.string().valid('active', 'inactive').optional(),
  note: optionalText.max(1000)
})

const updateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  contactName: optionalText.max(100),
  phone: Joi.string().trim().min(8).max(20).optional(),
  email: optionalText.max(150),
  address: optionalText.max(300),
  taxCode: optionalText.max(50),
  status: Joi.string().valid('active', 'inactive').optional(),
  note: optionalText.max(1000)
}).min(1)

export const supplierValidation = {
  createNew: validateRequest(createSchema),
  update: validateRequest(updateSchema)
}
