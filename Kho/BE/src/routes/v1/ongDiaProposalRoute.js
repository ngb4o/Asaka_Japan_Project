import express from 'express'
import { ongDiaProposalController } from '~/controllers/ongDiaProposalController'
import { ongDiaProposalValidation } from '~/validations/ongDiaProposalValidation'

const Router = express.Router()

Router.route('/')
  .get(ongDiaProposalController.list)
  .post(ongDiaProposalValidation.save, ongDiaProposalController.create)

Router.route('/:id')
  .get(ongDiaProposalController.getOne)
  .put(ongDiaProposalValidation.save, ongDiaProposalController.update)
  .delete(ongDiaProposalController.remove)

export const ongDiaProposalRoute = Router
