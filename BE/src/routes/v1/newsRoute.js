import express from 'express'
import { newsValidation } from '~/validations/newsValidation'
import { newsController } from '~/controllers/newsController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

// Public reads for landing / website
Router.get('/', newsController.getList)
Router.get('/:id', newsController.getDetails)

Router.use(verifyToken, attachUserRole)

Router.post('/', requireRoles('sales', 'warehouse'), newsValidation.createNew, newsController.createNew)
Router.put('/:id', requireRoles('sales', 'warehouse'), newsValidation.update, newsController.update)
Router.delete('/:id', requireRoles('sales', 'warehouse'), newsController.deleteOne)

export const newsRoute = Router
