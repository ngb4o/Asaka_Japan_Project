import express from 'express'
import { receivablesController } from '~/controllers/receivablesController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'
import { receivablesValidation } from '~/validations/receivablesValidation'

const Router = express.Router()

Router.use(verifyToken, attachUserRole)

Router.get(
  '/summary',
  requireRoles('sales', 'accountant'),
  receivablesController.getSummary
)

Router.post(
  '/dealers/:id/reminder-email',
  requireRoles('sales', 'accountant'),
  receivablesValidation.sendReminderEmail,
  receivablesController.sendDealerReminderEmail
)

export const receivablesRoute = Router
