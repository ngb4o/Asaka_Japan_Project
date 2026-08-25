import express from 'express'
import { quoteValidation } from '~/validations/quoteValidation'
import { quoteController } from '~/controllers/quoteController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

Router.use(verifyToken, attachUserRole)

Router.get(
  '/',
  requireRoles('admin', 'sales', 'accountant'),
  quoteController.getList
)

Router.get(
  '/:id',
  requireRoles('admin', 'sales', 'accountant'),
  quoteController.getDetails
)

Router.post(
  '/',
  requireRoles('admin', 'sales'),
  quoteValidation.createNew,
  quoteController.createNew
)

Router.put(
  '/:id',
  requireRoles('admin', 'sales'),
  quoteValidation.update,
  quoteController.update
)

Router.delete(
  '/:id',
  requireRoles('admin', 'sales'),
  quoteController.deleteOne
)

export const quoteRoute = Router