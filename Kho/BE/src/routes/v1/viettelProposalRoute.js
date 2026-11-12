import express from 'express'
import { viettelProposalController } from '~/controllers/viettelProposalController'
import { viettelProposalValidation } from '~/validations/viettelProposalValidation'

const Router = express.Router()

Router.route('/')
  .get(viettelProposalController.list)
  .post(viettelProposalValidation.save, viettelProposalController.create)

Router.route('/:id')
  .get(viettelProposalController.getOne)
  .put(viettelProposalValidation.save, viettelProposalController.update)
  .delete(viettelProposalController.remove)

export const viettelProposalRoute = Router
