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
export const uploadTripReceipt = upload
export const uploadOrderPhoto = upload

const audioFilter = (_req, file, cb) => {
  const type = String(file.mimetype || '').toLowerCase()
  const ok =
    type.startsWith('audio/') ||
    type === 'video/webm' ||
    type === 'application/octet-stream'
  if (ok) {
    cb(null, true)
    return
  }
  cb(new Error('Chỉ nhận file ghi âm (webm, mp4, m4a, ogg).'), false)
}

export const uploadChatAudio = multer({
  storage: multer.memoryStorage(),
  fileFilter: audioFilter,
  limits: {
    fileSize: 8 * 1024 * 1024
  }
}).single('audio')
