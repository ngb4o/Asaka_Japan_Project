import express from 'express'
import { proposalController } from '~/controllers/proposalController'
import { proposalValidation } from '~/validations/proposalValidation'

const Router = express.Router()

Router.route('/')
  .get(proposalController.list)
  .post(proposalValidation.save, proposalController.create)

Router.route('/:id')
  .get(proposalController.getOne)
  .put(proposalValidation.save, proposalController.update)
  .delete(proposalController.remove)

export const proposalRoute = Router
