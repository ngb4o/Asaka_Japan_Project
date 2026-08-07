import Joi from 'joi'
import { validateRequest } from '~/validations/validateRequest'

const optionalText = Joi.string().trim().allow('', null).optional()

const createSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  code: optionalText.max(50),
  address: optionalText.max(300),
  lat: Joi.number().min(-90).max(90).allow(null).optional(),
  lng: Joi.number().min(-180).max(180).allow(null).optional(),
  note: optionalText.max(500),
  status: Joi.string().valid('active', 'inactive').optional()
})

const updateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  code: optionalText.max(50),
  address: optionalText.max(300),
  lat: Joi.number().min(-90).max(90).allow(null).optional(),
  lng: Joi.number().min(-180).max(180).allow(null).optional(),
  note: optionalText.max(500),
  status: Joi.string().valid('active', 'inactive').optional()
}).min(1)

export const warehouseValidation = {
  createNew: validateRequest(createSchema),
  update: validateRequest(updateSchema)
}
