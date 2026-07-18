import express from 'express'
import { userValidation } from '~/validations/userValidation'
import { userController } from '~/controllers/userController'
import { verifyToken } from '~/middlewares/jwtMiddleware'

// Tạo Express Router để định nghĩa các routes
const Router = express.Router()

/**
 * Route: POST /v1/users/register
 * Đăng ký user mới
 *
 * Flow: Request → userValidation.register (validate dữ liệu) → userController.register (xử lý)
 */
Router.post('/register', userValidation.register, userController.register)

/**
 * Route: POST /v1/users/login
 * Đăng nhập user
 *
 * Flow: Request → userValidation.login (validate dữ liệu) → userController.login (xử lý)
 */
Router.post('/login', userValidation.login, userController.login)

/**
 * Route: POST /v1/users/logout
 * Đăng xuất user
 *
 * Flow: Request → verifyToken (xác thực token) → userController.logout (xử lý)
 */
Router.post('/logout', verifyToken, userController.logout)

/**
 * Route: GET /v1/users/userAuth
 * Lấy thông tin user hiện tại (từ token)
 *
 * Flow: Request → verifyToken (xác thực token) → userController.getProfile (xử lý)
 */
Router.get('/userAuth', verifyToken, userController.getProfile)

/**
 * Route: GET /v1/users/profile/:id
 * Lấy thông tin profile của user khác (cần đăng nhập)
 *
 * Flow: Request → verifyToken (xác thực token) → userValidation.getUserById (validate params) → userController.getUserById (xử lý)
 */
Router.get('/profile/:id', verifyToken, userValidation.getUserById, userController.getUserById)

export const userRoute = Router