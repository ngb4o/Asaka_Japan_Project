import express from 'express'
import { paymentRequestController } from '~/controllers/paymentRequestController'
import { paymentRequestValidation } from '~/validations/paymentRequestValidation'

const Router = express.Router()

Router.route('/')
  .get(paymentRequestController.list)
  .post(paymentRequestValidation.save, paymentRequestController.create)

Router.route('/:id')
  .get(paymentRequestController.getOne)
  .put(paymentRequestValidation.save, paymentRequestController.update)
  .delete(paymentRequestController.remove)

export const paymentRequestRoute = Router
