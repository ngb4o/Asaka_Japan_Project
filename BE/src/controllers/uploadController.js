import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

const uploadProductImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Image file is required!')
    }

    const imageUrl = `/uploads/products/${req.file.filename}`

    res.status(StatusCodes.CREATED).json({
      message: 'Image uploaded successfully!',
      data: {
        url: imageUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    })
  } catch (error) {
    next(error)
  }
}

const uploadNewsImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Image file is required!')
    }

    const imageUrl = `/uploads/news/${req.file.filename}`

    res.status(StatusCodes.CREATED).json({
      message: 'Image uploaded successfully!',
      data: {
        url: imageUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    })
  } catch (error) {
    next(error)
  }
}

export const uploadController = {
  uploadProductImage,
  uploadNewsImage
}
