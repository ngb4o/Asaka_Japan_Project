import express from 'express'
import { productValidation } from '~/validations/productValidation'
import { productController } from '~/controllers/productController'
import { verifyToken } from '~/middlewares/jwtMiddleware'

const Router = express.Router()

// Public reads for landing / website
Router.get('/', productController.getList)
Router.get('/:id', productController.getDetails)

// Authenticated writes for CRM
Router.post('/', verifyToken, productValidation.createNew, productController.createNew)
Router.put('/:id', verifyToken, productValidation.update, productController.update)
Router.delete('/:id', verifyToken, productController.deleteOne)

export const productRoute = Router
