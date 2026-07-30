import express from 'express'
import { warehouseValidation } from '~/validations/warehouseValidation'
import { warehouseController } from '~/controllers/warehouseController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

Router.use(verifyToken, attachUserRole)

Router.get('/', requireRoles('sales', 'warehouse'), warehouseController.getList)
Router.get('/:id', requireRoles('sales', 'warehouse'), warehouseController.getDetails)
Router.post('/', requireRoles('admin'), warehouseValidation.createNew, warehouseController.createNew)
Router.put('/:id', requireRoles('admin'), warehouseValidation.update, warehouseController.update)
Router.delete('/:id', requireRoles('admin'), warehouseController.deleteOne)

export const warehouseRoute = Router
