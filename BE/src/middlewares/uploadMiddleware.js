import multer from 'multer'

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

  if (allowed.includes(file.mimetype)) {
    cb(null, true)
    return
  }

  cb(new Error('Only image files (JPEG, PNG, WEBP, GIF) are allowed!'), false)
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024
  }
}).single('image')

export const uploadProductImage = upload
export const uploadNewsImage = upload
