import express from 'express'
import { dealerValidation } from '~/validations/dealerValidation'
import { dealerController } from '~/controllers/dealerController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

Router.use(verifyToken, attachUserRole)

Router.post('/', requireRoles('sales', 'warehouse'), dealerValidation.createNew, dealerController.createNew)
Router.get('/', requireRoles('sales', 'warehouse', 'accountant'), dealerController.getList)
Router.get('/:id', requireRoles('sales', 'warehouse', 'accountant'), dealerController.getDetails)
Router.put('/:id', requireRoles('sales', 'warehouse'), dealerValidation.update, dealerController.update)
Router.delete('/:id', requireRoles('sales', 'warehouse'), dealerController.deleteOne)

export const dealerRoute = Router
