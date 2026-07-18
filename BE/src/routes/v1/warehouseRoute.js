import express from 'express'
import { warehouseValidation } from '~/validations/warehouseValidation'
import { warehouseController } from '~/controllers/warehouseController'
import { verifyToken } from '~/middlewares/jwtMiddleware'

const Router = express.Router()

Router.use(verifyToken)

Router.post('/', warehouseValidation.createNew, warehouseController.createNew)
Router.get('/', warehouseController.getList)
Router.get('/:id', warehouseController.getDetails)
Router.put('/:id', warehouseValidation.update, warehouseController.update)
Router.delete('/:id', warehouseController.deleteOne)

export const warehouseRoute = Router
