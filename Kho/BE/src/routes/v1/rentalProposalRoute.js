import express from 'express'
import { rentalProposalController } from '~/controllers/rentalProposalController'
import { rentalProposalValidation } from '~/validations/rentalProposalValidation'

const Router = express.Router()

Router.route('/')
  .get(rentalProposalController.list)
  .post(rentalProposalValidation.save, rentalProposalController.create)

Router.route('/:id')
  .get(rentalProposalController.getOne)
  .put(rentalProposalValidation.save, rentalProposalController.update)
  .delete(rentalProposalController.remove)

export const rentalProposalRoute = Router
