import express from 'express'
import { productValidation } from '~/validations/productValidation'
import { productController } from '~/controllers/productController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

// Public reads for landing / website
Router.get('/', productController.getList)
Router.get('/:id', productController.getDetails)

Router.use(verifyToken, attachUserRole)

Router.post('/', requireRoles('admin'), productValidation.createNew, productController.createNew)
Router.put('/:id', requireRoles('admin'), productValidation.update, productController.update)
Router.delete('/:id', requireRoles('admin'), productController.deleteOne)

export const productRoute = Router
