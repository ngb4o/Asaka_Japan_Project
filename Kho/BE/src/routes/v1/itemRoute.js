import express from 'express'
import { itemController } from '~/controllers/itemController'
import { attachUploadedImage, requireItemImage, uploadItemImage } from '~/middlewares/uploadMiddleware'
import { itemValidation } from '~/validations/itemValidation'

const Router = express.Router()

Router.route('/')
  .get(itemController.getList)
  .post(
    uploadItemImage,
    itemValidation.createNew,
    requireItemImage,
    itemController.createNew
  )

Router.route('/:id')
  .put(
    itemValidation.validateId,
    uploadItemImage,
    itemValidation.update,
    attachUploadedImage,
    itemController.update
  )
  .delete(itemValidation.validateId, itemController.deleteOne)

export const itemRoute = Router
