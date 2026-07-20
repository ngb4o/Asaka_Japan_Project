import express from 'express'
import { quoteValidation } from '~/validations/quoteValidation'
import { quoteController } from '~/controllers/quoteController'
import { verifyToken } from '~/middlewares/jwtMiddleware'

const Router = express.Router()

Router.use(verifyToken)

Router.post('/', quoteValidation.createNew, quoteController.createNew)
Router.get('/', quoteController.getList)
Router.get('/:id', quoteController.getDetails)
Router.put('/:id', quoteValidation.update, quoteController.update)
Router.delete('/:id', quoteController.deleteOne)
Router.post('/:id/convert-to-order', quoteValidation.convertToOrder, quoteController.convertToOrder)

export const quoteRoute = Router
