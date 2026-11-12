import express from 'express'
import { phucVinhProposalController } from '~/controllers/phucVinhProposalController'
import { phucVinhProposalValidation } from '~/validations/phucVinhProposalValidation'

const Router = express.Router()

Router.route('/')
  .get(phucVinhProposalController.list)
  .post(phucVinhProposalValidation.save, phucVinhProposalController.create)

Router.route('/:id')
  .get(phucVinhProposalController.getOne)
  .put(phucVinhProposalValidation.save, phucVinhProposalController.update)
  .delete(phucVinhProposalController.remove)

export const phucVinhProposalRoute = Router
