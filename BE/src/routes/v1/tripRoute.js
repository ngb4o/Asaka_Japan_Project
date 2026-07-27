import express from 'express'
import { tripValidation } from '~/validations/tripValidation'
import { tripController } from '~/controllers/tripController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

Router.use(verifyToken, attachUserRole)

Router.post('/', requireRoles('sales', 'warehouse', 'accountant'), tripValidation.createNew, tripController.createNew)
Router.get('/', requireRoles('sales', 'warehouse', 'accountant'), tripController.getList)
Router.get('/:id', requireRoles('sales', 'warehouse', 'accountant'), tripController.getDetails)
Router.put('/:id', requireRoles('sales', 'warehouse', 'accountant'), tripValidation.update, tripController.update)
Router.delete('/:id', requireRoles('accountant'), tripController.deleteOne)

Router.post('/:id/stops', requireRoles('sales', 'warehouse', 'accountant'), tripValidation.addStop, tripController.addStop)
Router.delete('/:id/stops/:stopId', requireRoles('sales', 'warehouse', 'accountant'), tripController.removeStop)

Router.post('/:id/advances', requireRoles('accountant'), tripValidation.addAdvance, tripController.addAdvance)
Router.post('/:id/expenses', requireRoles('sales', 'warehouse', 'accountant'), tripValidation.addExpense, tripController.addExpense)
Router.put(
  '/:id/expenses/:expenseId/review',
  requireRoles('accountant'),
  tripValidation.reviewExpense,
  tripController.reviewExpense
)
Router.post('/:id/settle', requireRoles('accountant'), tripValidation.settle, tripController.settle)

export const tripRoute = Router
