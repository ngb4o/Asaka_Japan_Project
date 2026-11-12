import express from 'express'
import { slipController } from '~/controllers/slipController'
import { slipValidation } from '~/validations/slipValidation'

const Router = express.Router()

Router.route('/')
  .get(slipController.list)
  .post(slipValidation.create, slipController.create)

Router.route('/:id')
  .get(slipController.getOne)
  .put(slipValidation.create, slipController.update)
  .delete(slipController.remove)

export const slipRoute = Router
