import express from 'express'
import multer from 'multer'
import { uploadController } from '~/controllers/uploadController'
import { uploadNewsImage, uploadProductImage, uploadTripReceipt } from '~/middlewares/uploadMiddleware'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

const Router = express.Router()

Router.use(verifyToken)

const handleUpload =
  (middleware, controller) => (req, res, next) => {
    middleware(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(StatusCodes.BAD_REQUEST, 'Image must be smaller than 20MB!'))
        }
        return next(new ApiError(StatusCodes.BAD_REQUEST, error.message))
      }

      if (error) {
        return next(new ApiError(StatusCodes.BAD_REQUEST, error.message))
      }

      controller(req, res, next)
    })
  }

Router.post('/product-image', handleUpload(uploadProductImage, uploadController.uploadProductImage))
Router.post('/news-image', handleUpload(uploadNewsImage, uploadController.uploadNewsImage))
Router.post('/trip-receipt', handleUpload(uploadTripReceipt, uploadController.uploadTripReceipt))

export const uploadRoute = Router
