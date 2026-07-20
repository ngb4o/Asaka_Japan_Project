import express from 'express'
import { leadValidation } from '~/validations/leadValidation'
import { leadController } from '~/controllers/leadController'
import { verifyToken } from '~/middlewares/jwtMiddleware'

const Router = express.Router()

Router.post('/', leadValidation.createPublic, leadController.createPublic)

Router.use(verifyToken)

Router.get('/', leadController.getList)
Router.get('/:id', leadController.getDetails)
Router.put('/:id', leadValidation.update, leadController.update)
Router.delete('/:id', leadController.deleteOne)
Router.post('/:id/convert-to-dealer', leadController.convertToDealer)

export const leadRoute = Router
