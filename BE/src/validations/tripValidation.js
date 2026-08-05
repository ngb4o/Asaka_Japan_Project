import Joi from 'joi'
import { validateRequest } from '~/validations/validateRequest'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

const optionalText = Joi.string().trim().allow('', null).optional()
const objectId = Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)

const createSchema = Joi.object({
  title: optionalText.max(200),
  region: optionalText.max(150),
  startDate: Joi.alternatives().try(Joi.date(), Joi.string()).required(),
  endDate: Joi.alternatives().try(Joi.date(), Joi.string()).required(),
  status: Joi.string()
    .valid('draft', 'in_progress', 'settlement', 'closed', 'cancelled')
    .optional(),
  memberIds: Joi.array().items(objectId).min(1).required(),
  orderIds: Joi.array().items(objectId).optional(),
  note: optionalText.max(2000)
})

const updateSchema = Joi.object({
  title: optionalText.max(200),
  region: optionalText.max(150),
  startDate: Joi.alternatives().try(Joi.date(), Joi.string()).optional(),
  endDate: Joi.alternatives().try(Joi.date(), Joi.string()).optional(),
  status: Joi.string()
    .valid('draft', 'in_progress', 'settlement', 'cancelled')
    .optional(),
  memberIds: Joi.array().items(objectId).min(1).optional(),
  orderIds: Joi.array().items(objectId).optional(),
  note: optionalText.max(2000)
}).min(1)

const stopSchema = Joi.object({
  date: Joi.alternatives().try(Joi.date(), Joi.string()).optional(),
  dealerId: objectId.allow(null, '').optional(),
  location: optionalText.max(300),
  purpose: Joi.string().valid('delivery', 'collection', 'meeting', 'other').optional(),
  note: optionalText.max(1000),
  lat: Joi.number().min(-90).max(90).optional(),
  lng: Joi.number().min(-180).max(180).optional(),
  accuracy: Joi.number().min(0).allow(null).optional(),
  locationCapturedAt: Joi.alternatives().try(Joi.date(), Joi.string()).optional(),
  locationSource: Joi.string().valid('gps', 'manual').optional()
})

const advanceSchema = Joi.object({
  amount: Joi.number().positive().required(),
  note: optionalText.max(1000),
  receiptUrl: optionalText.max(500),
  receiptUrls: Joi.array().items(Joi.string().max(500)).max(5).optional()
})

const expenseSchema = Joi.object({
  category: Joi.string()
    .valid('fuel', 'food', 'lodging', 'toll', 'parking', 'other')
    .optional(),
  amount: Joi.number().positive().required(),
  date: Joi.alternatives().try(Joi.date(), Joi.string()).optional(),
  funding: Joi.string().valid('advance', 'reimburse').required(),
  /** NV trong chuyến đã tự bỏ tiền — bắt buộc khi funding=reimburse */
  paidByEmployeeId: Joi.when('funding', {
    is: 'reimburse',
    then: objectId.required(),
    otherwise: objectId.allow(null, '').optional()
  }),
  receiptUrl: optionalText.max(500),
  receiptUrls: Joi.array().items(Joi.string().max(500)).max(5).optional(),
  note: optionalText.max(1000),
  lat: Joi.number().min(-90).max(90).optional(),
  lng: Joi.number().min(-180).max(180).optional(),
  accuracy: Joi.number().min(0).allow(null).optional(),
  locationCapturedAt: Joi.alternatives().try(Joi.date(), Joi.string()).optional(),
  locationSource: Joi.string().valid('gps', 'manual').optional()
})

const reviewSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required()
})

const settleSchema = Joi.object({
  note: optionalText.max(2000)
})

export const tripValidation = {
  createNew: validateRequest(createSchema),
  update: validateRequest(updateSchema),
  addStop: validateRequest(stopSchema),
  addAdvance: validateRequest(advanceSchema),
  addExpense: validateRequest(expenseSchema),
  reviewExpense: validateRequest(reviewSchema),
  settle: validateRequest(settleSchema)
}
