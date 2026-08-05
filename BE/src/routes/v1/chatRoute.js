import express from 'express'
import { chatController } from '~/controllers/chatController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

Router.use(verifyToken, attachUserRole)
Router.use(requireRoles('admin'))

Router.post('/messages', chatController.streamMessage)
Router.post('/confirm', chatController.confirm)
Router.post('/cancel', chatController.cancel)

export const chatRoute = Router
