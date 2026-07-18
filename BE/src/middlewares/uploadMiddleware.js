import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { randomBytes } from 'crypto'

const createImageUpload = (folderName) => {
  const uploadDir = path.join(process.cwd(), 'uploads', folderName)

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir)
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase()
      const safeName = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`
      cb(null, safeName)
    }
  })

  const fileFilter = (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

    if (allowed.includes(file.mimetype)) {
      cb(null, true)
      return
    }

    cb(new Error('Only image files (JPEG, PNG, WEBP, GIF) are allowed!'), false)
  }

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 20 * 1024 * 1024
    }
  }).single('image')
}

export const uploadProductImage = createImageUpload('products')
export const uploadNewsImage = createImageUpload('news')
