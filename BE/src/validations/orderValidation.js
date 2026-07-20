import Joi from 'joi'
import { validateRequest } from '~/validations/validateRequest'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

const optionalText = Joi.string().trim().allow('', null).optional()

const lineItemSchema = Joi.object({
  productId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).required(),
  quantity: Joi.number().integer().min(1).required(),
  unitPrice: Joi.number().min(0).optional()
})

const createSchema = Joi.object({
  dealerId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).optional(),
  quoteId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).optional(),
  warehouseId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).optional(),
  customerName: optionalText.max(150),
  customerPhone: optionalText.max(20),
  customerEmail: optionalText.max(150),
  items: Joi.array().items(lineItemSchema).min(1).required(),
  discount: Joi.number().min(0).optional(),
  status: Joi.string()
    .valid('pending', 'confirmed', 'delivering', 'completed', 'cancelled')
    .optional(),
  note: optionalText.max(1000)
})

const updateSchema = Joi.object({
  dealerId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).allow(null).optional(),
  warehouseId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).allow(null).optional(),
  customerName: optionalText.max(150),
  customerPhone: optionalText.max(20),
  customerEmail: optionalText.max(150),
  items: Joi.array().items(lineItemSchema).min(1).optional(),
  discount: Joi.number().min(0).optional(),
  status: Joi.string()
    .valid('pending', 'confirmed', 'delivering', 'completed', 'cancelled')
    .optional(),
  note: optionalText.max(1000)
}).min(1)

export const orderValidation = {
  createNew: validateRequest(createSchema),
  update: validateRequest(updateSchema)
}
