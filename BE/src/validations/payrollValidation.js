import Joi from 'joi'
import { validateRequest } from '~/validations/validateRequest'

const generateSchema = Joi.object({
  period: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .required(),
  note: Joi.string().trim().allow('', null).max(2000).optional()
})

export const payrollValidation = {
  generate: validateRequest(generateSchema)
}
