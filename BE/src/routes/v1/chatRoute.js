import express from 'express'
import multer from 'multer'
import { StatusCodes } from 'http-status-codes'
import { chatController } from '~/controllers/chatController'
import { uploadChatAudio } from '~/middlewares/uploadMiddleware'
import { verifyToken } from '~/middlewares/jwtMiddleware'
import { attachUserRole, requireRoles } from '~/middlewares/roleMiddleware'
import ApiError from '~/utils/ApiError'

const Router = express.Router()

Router.use(verifyToken, attachUserRole)
Router.use(requireRoles('admin'))

Router.post('/messages', chatController.streamMessage)
Router.post('/confirm', chatController.confirm)
Router.post('/cancel', chatController.cancel)
Router.post('/transcribe', (req, res, next) => {
  uploadChatAudio(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(
          new ApiError(StatusCodes.BAD_REQUEST, 'File ghi âm tối đa 8MB.')
        )
      }
      return next(new ApiError(StatusCodes.BAD_REQUEST, error.message))
    }
    if (error) {
      return next(new ApiError(StatusCodes.BAD_REQUEST, error.message))
    }
    return chatController.transcribe(req, res, next)
  })
})

export const chatRoute = Router
