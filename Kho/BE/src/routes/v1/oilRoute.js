import express from 'express'
import { oilController } from '~/controllers/oilController'
import { oilValidation } from '~/validations/oilValidation'

const Router = express.Router()

Router.route('/')
  .get(oilController.getList)

Router.route('/:driverId')
  .get(oilValidation.validateId, oilController.getOne)

Router.route('/:driverId/km')
  .put(oilValidation.validateId, oilValidation.km, oilController.setKm)

Router.route('/:driverId/changes')
  .post(oilValidation.validateId, oilValidation.change, oilController.recordChange)

export const oilRoute = Router
