import express from 'express'
import { payrollValidation } from '~/validations/payrollValidation'
import { payrollController } from '~/controllers/payrollController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

Router.use(verifyToken, attachUserRole)

Router.get('/', requireRoles('sales', 'warehouse', 'accountant'), payrollController.getList)
Router.get('/:id', requireRoles('sales', 'warehouse', 'accountant'), payrollController.getDetails)
Router.post('/generate', requireRoles('accountant'), payrollValidation.generate, payrollController.generate)
Router.post('/:id/lock', requireRoles('accountant'), payrollController.lock)
Router.delete('/:id', requireRoles('accountant'), payrollController.deleteOne)

export const payrollRoute = Router
