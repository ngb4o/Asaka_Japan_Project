import express from 'express'
import { batteryProposalController } from '~/controllers/batteryProposalController'
import { batteryProposalValidation } from '~/validations/batteryProposalValidation'

const Router = express.Router()

Router.route('/')
  .get(batteryProposalController.list)
  .post(batteryProposalValidation.save, batteryProposalController.create)

Router.route('/:id')
  .get(batteryProposalController.getOne)
  .put(batteryProposalValidation.save, batteryProposalController.update)
  .delete(batteryProposalController.remove)

export const batteryProposalRoute = Router
