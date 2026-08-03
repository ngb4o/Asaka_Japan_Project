import fs from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { cloudinary, isCloudinaryEnabled } from '~/config/cloudinary'

const saveLocalImage = async (file, folderName) => {
  const uploadDir = path.join(process.cwd(), 'uploads', folderName)

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg'
  const filename = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`
  const absolutePath = path.join(uploadDir, filename)

  await fs.promises.writeFile(absolutePath, file.buffer)

  return {
    url: `/uploads/${folderName}/${filename}`,
    filename,
    size: file.size,
    mimetype: file.mimetype
  }
}

const uploadToCloudinary = (file, folderName) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `asaka/${folderName}`,
        resource_type: 'image',
        overwrite: false
      },
      (error, result) => {
        if (error) {
          reject(error)
          return
        }

        resolve({
          url: result.secure_url,
          filename: result.public_id,
          size: file.size,
          mimetype: file.mimetype
        })
      }
    )

    stream.end(file.buffer)
  })

const persistImage = async (file, folderName) => {
  if (!file) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Image file is required!')
  }

  if (isCloudinaryEnabled()) {
    return uploadToCloudinary(file, folderName)
  }

  return saveLocalImage(file, folderName)
}

const uploadProductImage = async (req, res, next) => {
  try {
    const data = await persistImage(req.file, 'products')

    res.status(StatusCodes.CREATED).json({
      message: 'Tải ảnh lên thành công!',
      data
    })
  } catch (error) {
    next(error)
  }
}

const uploadNewsImage = async (req, res, next) => {
  try {
    const data = await persistImage(req.file, 'news')

    res.status(StatusCodes.CREATED).json({
      message: 'Tải ảnh lên thành công!',
      data
    })
  } catch (error) {
    next(error)
  }
}

const uploadTripReceipt = async (req, res, next) => {
  try {
    const data = await persistImage(req.file, 'trip-receipts')

    res.status(StatusCodes.CREATED).json({
      message: 'Tải chứng từ lên thành công!',
      data
    })
  } catch (error) {
    next(error)
  }
}

export const uploadController = {
  uploadProductImage,
  uploadNewsImage,
  uploadTripReceipt
}
