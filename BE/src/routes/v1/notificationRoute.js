import express from 'express'
import { notificationController } from '~/controllers/notificationController'
import { pushController } from '~/controllers/pushController'
import { verifyToken } from '~/middlewares/jwtMiddleware'

const Router = express.Router()

Router.use(verifyToken)

Router.get('/', notificationController.getList)
Router.post('/mark-all-read', notificationController.markAllRead)

Router.get('/push/vapid-public-key', pushController.getVapidPublicKey)
Router.get('/push/status', pushController.getPushStatus)
Router.post('/push/subscribe', pushController.subscribe)
Router.post('/push/unsubscribe', pushController.unsubscribe)
Router.post('/push/test', pushController.sendTest)

export const notificationRoute = Router
