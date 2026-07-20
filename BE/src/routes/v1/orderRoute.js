import express from 'express'
import { orderValidation } from '~/validations/orderValidation'
import { orderController } from '~/controllers/orderController'
import { verifyToken } from '~/middlewares/jwtMiddleware'

const Router = express.Router()

Router.use(verifyToken)

Router.post('/', orderValidation.createNew, orderController.createNew)
Router.get('/', orderController.getList)
Router.get('/:id', orderController.getDetails)
Router.put('/:id', orderValidation.update, orderController.update)
Router.delete('/:id', orderController.deleteOne)

export const orderRoute = Router
