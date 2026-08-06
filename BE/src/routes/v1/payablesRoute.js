import express from 'express'
import { payablesController } from '~/controllers/payablesController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

Router.use(verifyToken, attachUserRole)

Router.get(
  '/summary',
  requireRoles('warehouse', 'accountant'),
  payablesController.getSummary
)

export const payablesRoute = Router
