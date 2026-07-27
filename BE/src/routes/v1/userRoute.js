import express from 'express'
import { userValidation } from '~/validations/userValidation'
import { userController } from '~/controllers/userController'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'

const Router = express.Router()

// Public registration disabled — kept route returns 403 for old clients
Router.post('/register', userValidation.register, userController.register)
Router.post('/login', userValidation.login, userController.login)
Router.post('/logout', verifyToken, userController.logout)
Router.get('/userAuth', verifyToken, attachUserRole, userController.getProfile)
Router.get(
  '/profile/:id',
  verifyToken,
  attachUserRole,
  userValidation.getUserById,
  userController.getUserById
)

Router.get(
  '/',
  verifyToken,
  attachUserRole,
  requireRoles('admin', 'accountant'),
  userController.getList
)

Router.post(
  '/',
  verifyToken,
  attachUserRole,
  requireRoles('admin'),
  userValidation.createByAdmin,
  userController.createByAdmin
)

Router.put(
  '/me/password',
  verifyToken,
  attachUserRole,
  userValidation.changeOwnPassword,
  userController.changeOwnPassword
)

Router.put(
  '/:id/password',
  verifyToken,
  attachUserRole,
  requireRoles('admin'),
  userValidation.updatePassword,
  userController.updatePassword
)

Router.put(
  '/:id/role',
  verifyToken,
  attachUserRole,
  requireRoles('admin'),
  userValidation.updateRole,
  userController.updateRole
)

export const userRoute = Router
