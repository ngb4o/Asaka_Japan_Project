import express from 'express'
import { weldProposalController } from '~/controllers/weldProposalController'
import { weldProposalValidation } from '~/validations/weldProposalValidation'

const Router = express.Router()

Router.route('/')
  .get(weldProposalController.list)
  .post(weldProposalValidation.save, weldProposalController.create)

Router.route('/:id')
  .get(weldProposalController.getOne)
  .put(weldProposalValidation.save, weldProposalController.update)
  .delete(weldProposalController.remove)

export const weldProposalRoute = Router
