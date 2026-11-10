import express from 'express'
import { authController } from '~/controllers/authController'
import { verifyToken } from '~/middlewares/authMiddleware'
import { authValidation } from '~/validations/authValidation'

const Router = express.Router()

Router.post('/login', authValidation.login, authController.login)
Router.get('/me', verifyToken, authController.me)

export const authRoute = Router
