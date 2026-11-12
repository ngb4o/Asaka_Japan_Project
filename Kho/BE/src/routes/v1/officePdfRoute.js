import express from 'express'
import { officePdfController } from '~/controllers/officePdfController'

const Router = express.Router()

Router.route('/').post(officePdfController.create)

export const officePdfRoute = Router
