import express from 'express'
import { orderValidation } from '~/validations/orderValidation'
import { orderController } from '~/controllers/orderController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

Router.use(verifyToken, attachUserRole)

Router.post(
  '/',
  requireRoles('sales', 'warehouse', 'accountant'),
  orderValidation.createNew,
  orderController.createNew
)
Router.get('/', requireRoles('sales', 'warehouse', 'accountant'), orderController.getList)
Router.get(
  '/:id/audits',
  requireRoles('sales', 'warehouse', 'accountant'),
  orderController.getAudits
)
Router.get(
  '/:id',
  requireRoles('sales', 'warehouse', 'accountant'),
  orderController.getDetails
)
Router.put(
  '/:id',
  requireRoles('sales', 'warehouse', 'accountant'),
  orderValidation.update,
  orderController.update
)
Router.post(
  '/:id/payments',
  requireRoles('sales', 'accountant'),
  orderValidation.recordPayment,
  orderController.recordPayment
)
Router.delete('/:id', requireRoles('sales', 'warehouse'), orderController.deleteOne)

export const orderRoute = Router
