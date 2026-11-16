import express from 'express'
import { advanceProposalController } from '~/controllers/advanceProposalController'
import { advanceProposalValidation } from '~/validations/advanceProposalValidation'

const Router = express.Router()

Router.route('/')
  .get(advanceProposalController.list)
  .post(advanceProposalValidation.save, advanceProposalController.create)

Router.route('/:id')
  .get(advanceProposalController.getOne)
  .put(advanceProposalValidation.save, advanceProposalController.update)
  .delete(advanceProposalController.remove)

export const advanceProposalRoute = Router
