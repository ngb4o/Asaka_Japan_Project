import express from 'express'
import { productCategoryValidation } from '~/validations/productCategoryValidation'
import { productCategoryController } from '~/controllers/productCategoryController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

// Public reads for landing / website
Router.get('/', productCategoryController.getList)
Router.get('/:id', productCategoryController.getDetails)

Router.use(verifyToken, attachUserRole)

Router.post('/', requireRoles('admin'), productCategoryValidation.createNew, productCategoryController.createNew)
Router.put('/:id', requireRoles('admin'), productCategoryValidation.update, productCategoryController.update)
Router.delete('/:id', requireRoles('admin'), productCategoryController.deleteOne)

export const productCategoryRoute = Router
