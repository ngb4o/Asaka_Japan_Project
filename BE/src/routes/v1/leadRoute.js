import express from 'express'
import { leadValidation } from '~/validations/leadValidation'
import { leadController } from '~/controllers/leadController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

Router.post('/', leadValidation.createPublic, leadController.createPublic)

Router.use(verifyToken, attachUserRole)

Router.get('/', requireRoles('sales', 'warehouse'), leadController.getList)
Router.get('/:id', requireRoles('sales', 'warehouse'), leadController.getDetails)
Router.put('/:id', requireRoles('sales', 'warehouse'), leadValidation.update, leadController.update)
Router.delete('/:id', requireRoles('sales', 'warehouse'), leadController.deleteOne)
Router.post(
  '/:id/convert-to-dealer',
  requireRoles('sales', 'warehouse'),
  leadController.convertToDealer
)

export const leadRoute = Router
