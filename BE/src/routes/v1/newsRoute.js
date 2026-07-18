import express from 'express'
import { newsValidation } from '~/validations/newsValidation'
import { newsController } from '~/controllers/newsController'
import { verifyToken } from '~/middlewares/jwtMiddleware'

const Router = express.Router()

// Public reads for landing / website
Router.get('/', newsController.getList)
Router.get('/:id', newsController.getDetails)

// Authenticated writes for CRM
Router.post('/', verifyToken, newsValidation.createNew, newsController.createNew)
Router.put('/:id', verifyToken, newsValidation.update, newsController.update)
Router.delete('/:id', verifyToken, newsController.deleteOne)

export const newsRoute = Router
