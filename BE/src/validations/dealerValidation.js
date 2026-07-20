import Joi from 'joi'
import { validateRequest } from '~/validations/validateRequest'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

const optionalText = Joi.string().trim().allow('', null).optional()

const createSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  contactName: optionalText.max(100),
  phone: Joi.string().trim().min(8).max(20).required(),
  email: optionalText.max(150),
  address: optionalText.max(300),
  region: optionalText.max(100),
  tier: Joi.string().valid('standard', 'silver', 'gold').optional(),
  discountPercent: Joi.number().min(0).max(100).optional(),
  status: Joi.string().valid('pending', 'active', 'inactive').optional(),
  note: optionalText.max(1000),
  leadId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).optional()
})

const updateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  contactName: optionalText.max(100),
  phone: Joi.string().trim().min(8).max(20).optional(),
  email: optionalText.max(150),
  address: optionalText.max(300),
  region: optionalText.max(100),
  tier: Joi.string().valid('standard', 'silver', 'gold').optional(),
  discountPercent: Joi.number().min(0).max(100).optional(),
  status: Joi.string().valid('pending', 'active', 'inactive').optional(),
  note: optionalText.max(1000)
}).min(1)

export const dealerValidation = {
  createNew: validateRequest(createSchema),
  update: validateRequest(updateSchema)
}
