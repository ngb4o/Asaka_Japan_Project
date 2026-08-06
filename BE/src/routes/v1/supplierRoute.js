import express from 'express'
import { supplierValidation } from '~/validations/supplierValidation'
import { supplierController } from '~/controllers/supplierController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

Router.use(verifyToken, attachUserRole)

Router.post(
  '/',
  requireRoles('warehouse', 'accountant'),
  supplierValidation.createNew,
  supplierController.createNew
)
Router.get(
  '/',
  requireRoles('warehouse', 'accountant', 'sales'),
  supplierController.getList
)
Router.get(
  '/:id',
  requireRoles('warehouse', 'accountant', 'sales'),
  supplierController.getDetails
)
Router.put(
  '/:id',
  requireRoles('warehouse', 'accountant'),
  supplierValidation.update,
  supplierController.update
)
Router.delete(
  '/:id',
  requireRoles('warehouse'),
  supplierController.deleteOne
)

export const supplierRoute = Router
