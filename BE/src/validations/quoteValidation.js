import Joi from 'joi'
import { OBJECT_ID_RULE } from '~/utils/validators'
import { validateRequest } from '~/validations/validateRequest'

const optionalText = Joi.string().trim().allow('', null).optional()

const quoteLineSchema = Joi.object({
  productId: Joi.string().pattern(OBJECT_ID_RULE).required(),
  name: Joi.string().trim().min(1).max(200).required(),
  sku: optionalText.max(50),
  activeIngredient: optionalText.max(200),
  application: optionalText.max(2000),
  unitsPerCase: Joi.number().integer().min(1).optional(),
  costPrice: Joi.number().min(0).required(),
  quantity: Joi.number().integer().min(1).optional(),
  marginPercent: Joi.number().min(0).max(1000).required(),
  overrideUnitPrice: Joi.number().min(0).allow(null).optional()
})

const createSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  description: optionalText.max(2000),
  defaultMarginPercent: Joi.number().min(0).max(1000).required(),
  dealerIds: Joi.array()
    .items(Joi.string().pattern(OBJECT_ID_RULE))
    .optional()
    .default([]),
  lines: Joi.array().items(quoteLineSchema).optional().default([]),
  validFrom: Joi.date().iso().allow(null).optional(),
  validUntil: Joi.date().iso().allow(null).optional()
})

const updateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional(),
  description: optionalText.max(2000),
  defaultMarginPercent: Joi.number().min(0).max(1000).optional(),
  dealerIds: Joi.array()
    .items(Joi.string().pattern(OBJECT_ID_RULE))
    .optional(),
  lines: Joi.array().items(quoteLineSchema).optional(),
  validFrom: Joi.date().iso().allow(null).optional(),
  validUntil: Joi.date().iso().allow(null).optional()
}).min(1)

export const quoteValidation = {
  createNew: validateRequest(createSchema),
  update: validateRequest(updateSchema)
}