import express from 'express'
import { inventoryValidation } from '~/validations/inventoryValidation'
import { inventoryController } from '~/controllers/inventoryController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

Router.use(verifyToken, attachUserRole)

Router.get(
  '/stocks',
  requireRoles('sales', 'warehouse'),
  inventoryController.getStocks
)
Router.get(
  '/transactions',
  requireRoles('sales', 'warehouse'),
  inventoryController.getTransactions
)
Router.post(
  '/import',
  requireRoles('warehouse'),
  inventoryValidation.importStock,
  inventoryController.importStock
)
Router.post(
  '/export',
  requireRoles('warehouse'),
  inventoryValidation.exportStock,
  inventoryController.exportStock
)

export const inventoryRoute = Router
