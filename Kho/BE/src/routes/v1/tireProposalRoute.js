import express from 'express'
import { tireProposalController } from '~/controllers/tireProposalController'
import { tireProposalValidation } from '~/validations/tireProposalValidation'

const Router = express.Router()

Router.route('/')
  .get(tireProposalController.list)
  .post(tireProposalValidation.save, tireProposalController.create)

Router.route('/:id')
  .get(tireProposalController.getOne)
  .put(tireProposalValidation.save, tireProposalController.update)
  .delete(tireProposalController.remove)

export const tireProposalRoute = Router
