import Joi from 'joi'
import { validateRequest } from '~/validations/validateRequest'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

const optionalText = Joi.string().trim().allow('', null).optional()
const optionalDate = Joi.alternatives()
  .try(Joi.date().iso(), Joi.string().isoDate(), Joi.valid(null, ''))
  .optional()

const lineItemSchema = Joi.object({
  productId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).required(),
  quantity: Joi.number().integer().min(1).required(),
  unitType: Joi.string().valid('chai', 'thung').optional(),
  unitPrice: Joi.number().min(0).optional()
})

const shippingFields = {
  shippingAddress: optionalText.max(500),
  shippingContactName: optionalText.max(150),
  shippingPhone: optionalText.max(20),
  carrier: optionalText.max(150),
  deliveryEmployeeIds: Joi.array()
    .items(Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE))
    .optional(),
  deliveryEmployeeId: Joi.string()
    .pattern(OBJECT_ID_RULE)
    .message(OBJECT_ID_RULE_MESSAGE)
    .allow(null, '')
    .optional(),
  trackingCode: optionalText.max(100),
  shippingDate: optionalDate,
  deliveredAt: optionalDate,
  shippingFee: Joi.number().min(0).optional(),
  shippingNote: optionalText.max(1000)
}

const paymentFields = {
  paymentStatus: Joi.string().valid('unpaid', 'partial', 'paid').optional(),
  paidAmount: Joi.number().min(0).optional(),
  paymentNote: optionalText.max(1000)
}

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
  note: optionalText.max(1000),
  ...paymentFields,
  ...shippingFields
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
  note: optionalText.max(1000),
  ...paymentFields,
  ...shippingFields
}).min(1)

const recordPaymentSchema = Joi.object({
  amount: Joi.number().min(0).required(),
  note: optionalText.max(1000)
})

export const orderValidation = {
  createNew: validateRequest(createSchema),
  update: validateRequest(updateSchema),
  recordPayment: validateRequest(recordPaymentSchema)
}
