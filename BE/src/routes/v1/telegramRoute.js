import express from 'express'
import { telegramController } from '~/controllers/telegramController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

// Public webhook for Telegram Bot API
Router.post('/webhook', telegramController.webhook)

Router.use(verifyToken, attachUserRole)
Router.use(requireRoles('admin'))

Router.get('/status', telegramController.getStatus)
Router.get('/contacts', telegramController.listContacts)
Router.post('/contacts', telegramController.upsertContact)
Router.delete('/contacts/:chatId', telegramController.deleteContact)
Router.post('/test-send', telegramController.sendTest)
Router.post('/set-webhook', telegramController.setWebhook)
Router.get('/webhook-info', telegramController.getWebhookInfo)

export const telegramRoute = Router
