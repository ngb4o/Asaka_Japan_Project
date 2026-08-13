import Joi from 'joi'
import { validateRequest } from '~/validations/validateRequest'

const optionalText = Joi.string().trim().allow('', null).optional()

const sendReminderEmailSchema = Joi.object({
  email: optionalText.max(150)
})

export const receivablesValidation = {
  sendReminderEmail: validateRequest(sendReminderEmailSchema)
}
