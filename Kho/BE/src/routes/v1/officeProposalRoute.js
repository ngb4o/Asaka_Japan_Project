import express from 'express'
import { officeProposalController } from '~/controllers/officeProposalController'
import { officeProposalValidation } from '~/validations/officeProposalValidation'

const Router = express.Router()

Router.route('/')
  .get(officeProposalController.list)
  .post(officeProposalValidation.save, officeProposalController.create)

Router.route('/:id')
  .get(officeProposalController.getOne)
  .put(officeProposalValidation.save, officeProposalController.update)
  .delete(officeProposalController.remove)

export const officeProposalRoute = Router
