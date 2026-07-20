import express from 'express'
import { productCategoryValidation } from '~/validations/productCategoryValidation'
import { productCategoryController } from '~/controllers/productCategoryController'
import { verifyToken } from '~/middlewares/jwtMiddleware'

const Router = express.Router()

// Public reads for landing / website
Router.get('/', productCategoryController.getList)
Router.get('/:id', productCategoryController.getDetails)

// Authenticated writes for CRM
Router.use(verifyToken)

Router.post('/', productCategoryValidation.createNew, productCategoryController.createNew)
Router.put('/:id', productCategoryValidation.update, productCategoryController.update)
Router.delete('/:id', productCategoryController.deleteOne)

export const productCategoryRoute = Router
