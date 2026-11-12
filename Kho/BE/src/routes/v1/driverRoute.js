import express from 'express'
import { driverController } from '~/controllers/driverController'
import { driverValidation } from '~/validations/driverValidation'

const Router = express.Router()

Router.route('/')
  .get(driverController.getList)
  .post(driverValidation.createNew, driverController.createNew)

Router.route('/:id')
  .put(driverValidation.validateId, driverValidation.update, driverController.update)
  .delete(driverValidation.validateId, driverController.deleteOne)

export const driverRoute = Router
