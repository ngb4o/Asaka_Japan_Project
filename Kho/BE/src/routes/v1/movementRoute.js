import express from 'express'
import { movementController } from '~/controllers/movementController'
import { movementValidation } from '~/validations/movementValidation'

const Router = express.Router()

Router.route('/').get(movementController.getList)

Router.route('/items/:id')
  .get(movementValidation.validateItemId, movementController.getByItem)
  .post(
    movementValidation.validateItemId,
    movementValidation.create,
    movementController.create
  )

Router.route('/:id')
  .get(movementValidation.validateItemId, movementController.getOne)
  .put(movementValidation.validateItemId, movementValidation.update, movementController.update)
  .delete(movementValidation.validateItemId, movementController.remove)

export const movementRoute = Router
