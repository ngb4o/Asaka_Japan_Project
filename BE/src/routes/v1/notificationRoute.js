import express from 'express'
import { notificationController } from '~/controllers/notificationController'
import { verifyToken } from '~/middlewares/jwtMiddleware'

const Router = express.Router()

Router.use(verifyToken)

Router.get('/', notificationController.getList)
Router.post('/mark-all-read', notificationController.markAllRead)

export const notificationRoute = Router
