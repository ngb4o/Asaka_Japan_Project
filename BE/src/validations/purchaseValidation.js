import Joi from 'joi'
import { validateRequest } from '~/validations/validateRequest'

const paymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  note: Joi.string().trim().allow('').max(500).optional()
})

export const purchaseValidation = {
  recordPayment: validateRequest(paymentSchema)
}
