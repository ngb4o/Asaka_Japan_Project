import express from 'express'
import { dealerValidation } from '~/validations/dealerValidation'
import { dealerController } from '~/controllers/dealerController'
import { verifyToken } from '~/middlewares/jwtMiddleware'

const Router = express.Router()

Router.use(verifyToken)

Router.post('/', dealerValidation.createNew, dealerController.createNew)
Router.get('/', dealerController.getList)
Router.get('/:id', dealerController.getDetails)
Router.put('/:id', dealerValidation.update, dealerController.update)
Router.delete('/:id', dealerController.deleteOne)

export const dealerRoute = Router
