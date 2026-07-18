import express from 'express'
import { inventoryValidation } from '~/validations/inventoryValidation'
import { inventoryController } from '~/controllers/inventoryController'
import { verifyToken } from '~/middlewares/jwtMiddleware'

const Router = express.Router()

Router.use(verifyToken)

Router.get('/stocks', inventoryController.getStocks)
Router.get('/transactions', inventoryController.getTransactions)
Router.post('/import', inventoryValidation.importStock, inventoryController.importStock)
Router.post('/export', inventoryValidation.exportStock, inventoryController.exportStock)

export const inventoryRoute = Router
