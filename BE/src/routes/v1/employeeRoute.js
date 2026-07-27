import express from 'express'
import { employeeValidation } from '~/validations/employeeValidation'
import { employeeController } from '~/controllers/employeeController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

Router.use(verifyToken, attachUserRole)

Router.post('/', requireRoles('accountant'), employeeValidation.createNew, employeeController.createNew)
Router.get('/', requireRoles('sales', 'warehouse', 'accountant'), employeeController.getList)
Router.get('/:id', requireRoles('sales', 'warehouse', 'accountant'), employeeController.getDetails)
Router.put('/:id', requireRoles('accountant'), employeeValidation.update, employeeController.update)
Router.delete('/:id', requireRoles('accountant'), employeeController.deleteOne)

export const employeeRoute = Router
