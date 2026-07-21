import express from 'express'
import { quoteValidation } from '~/validations/quoteValidation'
import { quoteController } from '~/controllers/quoteController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

Router.use(verifyToken, attachUserRole)

Router.post(
  '/',
  requireRoles('sales'),
  quoteValidation.createNew,
  quoteController.createNew
)
Router.get('/', requireRoles('sales', 'accountant'), quoteController.getList)
Router.get('/:id', requireRoles('sales', 'accountant'), quoteController.getDetails)
Router.put(
  '/:id',
  requireRoles('sales'),
  quoteValidation.update,
  quoteController.update
)
Router.delete('/:id', requireRoles('sales'), quoteController.deleteOne)
Router.post(
  '/:id/convert-to-order',
  requireRoles('sales'),
  quoteValidation.convertToOrder,
  quoteController.convertToOrder
)

export const quoteRoute = Router
