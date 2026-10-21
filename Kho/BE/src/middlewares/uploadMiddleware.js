import path from 'path'
import multer from 'multer'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { saveItemImage } from '~/utils/saveImage'

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence'
])

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'])

const fileFilter = (_req, file, cb) => {
  const mime = String(file.mimetype || '').toLowerCase()
  const ext = path.extname(file.originalname || '').toLowerCase()
  const mimeMissing = !mime || mime === 'application/octet-stream'

  if (ALLOWED_MIME.has(mime) || (mimeMissing && IMAGE_EXT.has(ext))) {
    cb(null, true)
    return
  }

  cb(new Error('Chỉ nhận ảnh JPEG, PNG, WEBP, GIF hoặc HEIC'), false)
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }
}).single('image')

export const uploadItemImage = (req, res, next) => {
  upload(req, res, (err) => {
    if (!err) {
      next()
      return
    }

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      next(new ApiError(StatusCodes.BAD_REQUEST, 'Ảnh tối đa 20MB'))
      return
    }

    next(new ApiError(StatusCodes.BAD_REQUEST, err.message || 'Tải ảnh thất bại'))
  })
}

const persistImage = async (req) => {
  const saved = await saveItemImage(req.file, 'items')
  req.body.image = saved.url
}

export const requireItemImage = async (req, res, next) => {
  try {
    if (!req.file) {
      next(new ApiError(StatusCodes.BAD_REQUEST, 'Ảnh sản phẩm là bắt buộc'))
      return
    }

    await persistImage(req)
    next()
  } catch (error) {
    next(error)
  }
}

export const attachUploadedImage = async (req, res, next) => {
  try {
    if (req.file) await persistImage(req)
    next()
  } catch (error) {
    next(error)
  }
}
