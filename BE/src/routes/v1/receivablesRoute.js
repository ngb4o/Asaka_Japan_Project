import express from 'express'
import { receivablesController } from '~/controllers/receivablesController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

Router.use(verifyToken, attachUserRole)

Router.get(
  '/summary',
  requireRoles('sales', 'accountant'),
  receivablesController.getSummary
)

export const receivablesRoute = Router
