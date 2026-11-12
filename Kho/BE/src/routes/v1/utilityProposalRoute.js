import express from 'express'
import { utilityProposalController } from '~/controllers/utilityProposalController'
import { utilityProposalValidation } from '~/validations/utilityProposalValidation'

const Router = express.Router()

Router.route('/')
  .get(utilityProposalController.list)
  .post(utilityProposalValidation.save, utilityProposalController.create)

Router.route('/:id')
  .get(utilityProposalController.getOne)
  .put(utilityProposalValidation.save, utilityProposalController.update)
  .delete(utilityProposalController.remove)

export const utilityProposalRoute = Router
