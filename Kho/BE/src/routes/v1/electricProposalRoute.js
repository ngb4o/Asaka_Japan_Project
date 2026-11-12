import express from 'express'
import { electricProposalController } from '~/controllers/electricProposalController'
import { electricProposalValidation } from '~/validations/electricProposalValidation'

const Router = express.Router()

Router.route('/')
  .get(electricProposalController.list)
  .post(electricProposalValidation.save, electricProposalController.create)

Router.route('/:id')
  .get(electricProposalController.getOne)
  .put(electricProposalValidation.save, electricProposalController.update)
  .delete(electricProposalController.remove)

export const electricProposalRoute = Router
