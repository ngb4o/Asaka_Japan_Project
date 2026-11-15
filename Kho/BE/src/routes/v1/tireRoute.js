import express from 'express'
import { tireController } from '~/controllers/tireController'
import { tireValidation } from '~/validations/tireValidation'

const Router = express.Router()

Router.route('/')
  .get(tireController.getList)
  .post(tireValidation.create, tireController.createNew)

Router.route('/mount')
  .post(tireValidation.mount, tireController.mount)

Router.route('/:id')
  .get(tireValidation.validateId, tireController.getOne)
  .put(tireValidation.validateId, tireValidation.correct, tireController.correct)

Router.route('/:id/move')
  .post(tireValidation.validateId, tireValidation.move, tireController.move)

export const tireRoute = Router
