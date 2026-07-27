import express from 'express'
import { dashboardController } from '~/controllers/dashboardController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

Router.use(verifyToken, attachUserRole)

Router.get('/summary', requireRoles('sales', 'warehouse', 'accountant'), dashboardController.getSummary)
Router.get('/reports', requireRoles('accountant'), dashboardController.getReports)

export const dashboardRoute = Router
