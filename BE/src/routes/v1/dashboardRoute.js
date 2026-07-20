import express from 'express'
import { dashboardController } from '~/controllers/dashboardController'
import { verifyToken } from '~/middlewares/jwtMiddleware'

const Router = express.Router()

Router.use(verifyToken)

Router.get('/summary', dashboardController.getSummary)

export const dashboardRoute = Router
