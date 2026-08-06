import express from 'express'
import { purchaseValidation } from '~/validations/purchaseValidation'
import { purchaseController } from '~/controllers/purchaseController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

Router.use(verifyToken, attachUserRole)

Router.get(
  '/',
  requireRoles('warehouse', 'accountant'),
  purchaseController.getList
)
Router.get(
  '/:id',
  requireRoles('warehouse', 'accountant'),
  purchaseController.getDetails
)
Router.post(
  '/:id/payments',
  requireRoles('accountant', 'warehouse'),
  purchaseValidation.recordPayment,
  purchaseController.recordPayment
)

export const purchaseRoute = Router
