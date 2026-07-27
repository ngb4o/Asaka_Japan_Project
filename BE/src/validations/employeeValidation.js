import Joi from 'joi'
import { validateRequest } from '~/validations/validateRequest'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

const optionalText = Joi.string().trim().allow('', null).optional()

const createSchema = Joi.object({
  code: optionalText.max(50),
  fullName: Joi.string().trim().min(2).max(150).required(),
  phone: optionalText.max(20),
  email: optionalText.max(150),
  title: optionalText.max(100),
  department: optionalText.max(100),
  userId: Joi.string()
    .pattern(OBJECT_ID_RULE)
    .message(OBJECT_ID_RULE_MESSAGE)
    .allow(null, '')
    .optional(),
  baseSalary: Joi.number().min(0).optional(),
  commissionPercent: Joi.number().min(0).max(100).optional(),
  allowance: Joi.number().min(0).optional(),
  bankAccount: optionalText.max(100),
  bankName: optionalText.max(150),
  bankQrImage: optionalText.max(500),
  status: Joi.string().valid('active', 'inactive').optional(),
  note: optionalText.max(1000)
})

const updateSchema = Joi.object({
  code: optionalText.max(50),
  fullName: Joi.string().trim().min(2).max(150).optional(),
  phone: optionalText.max(20),
  email: optionalText.max(150),
  title: optionalText.max(100),
  department: optionalText.max(100),
  userId: Joi.string()
    .pattern(OBJECT_ID_RULE)
    .message(OBJECT_ID_RULE_MESSAGE)
    .allow(null, '')
    .optional(),
  baseSalary: Joi.number().min(0).optional(),
  commissionPercent: Joi.number().min(0).max(100).optional(),
  allowance: Joi.number().min(0).optional(),
  bankAccount: optionalText.max(100),
  bankName: optionalText.max(150),
  bankQrImage: optionalText.max(500),
  status: Joi.string().valid('active', 'inactive').optional(),
  note: optionalText.max(1000)
}).min(1)

export const employeeValidation = {
  createNew: validateRequest(createSchema),
  update: validateRequest(updateSchema)
}
