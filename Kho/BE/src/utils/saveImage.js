import fs from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'
import { createRequire } from 'module'
import { StatusCodes } from 'http-status-codes'
import { cloudinary, isCloudinaryEnabled } from '~/config/cloudinary'
import ApiError from '~/utils/ApiError'

const require = createRequire(__filename)
const convertHeic = require('heic-convert')

const SAFE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])
const HEIC_EXT = new Set(['.heic', '.heif'])
const HEIC_MIME = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence'
])

const isHeic = (file) => {
  const mime = String(file.mimetype || '').toLowerCase()
  const ext = path.extname(file.originalname || '').toLowerCase()
  return HEIC_MIME.has(mime) || HEIC_EXT.has(ext)
}

const toJpeg = async (file) => {
  if (!isHeic(file)) return file

  try {
    const output = await convertHeic({
      buffer: Buffer.from(file.buffer),
      format: 'JPEG',
      quality: 0.9
    })
    const buffer = Buffer.from(output)
    const base = path.basename(file.originalname || 'anh', path.extname(file.originalname || ''))

    return {
      buffer,
      size: buffer.length,
      mimetype: 'image/jpeg',
      originalname: `${base}.jpg`
    }
  } catch {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Không đọc được ảnh HEIC. Hãy thử JPEG hoặc PNG.')
  }
}

const uploadsRoot = () => path.resolve(process.cwd(), 'uploads')

const saveLocalImage = async (file, folderName) => {
  const uploadDir = path.join(uploadsRoot(), folderName)
  await fs.promises.mkdir(uploadDir, { recursive: true })

  const ext = path.extname(file.originalname || '').toLowerCase()
  const safeExt = SAFE_EXT.has(ext) ? ext : '.jpg'
  const filename = `${Date.now()}-${randomBytes(6).toString('hex')}${safeExt}`

  await fs.promises.writeFile(path.join(uploadDir, filename), file.buffer)

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

export const saveItemImage = async (file, folderName = 'items') => {
  const image = await toJpeg(file)
  if (isCloudinaryEnabled()) return uploadToCloudinary(image, folderName)
  return saveLocalImage(image, folderName)
}

const cloudinaryPublicId = (url) => {
  try {
    const { hostname, pathname } = new URL(url)
    if (!hostname.endsWith('res.cloudinary.com')) return null

    const marker = '/upload/'
    const index = pathname.indexOf(marker)
    if (index < 0) return null

    let rest = pathname.slice(index + marker.length)
    rest = rest.replace(/^v\d+\//, '')
    return rest.replace(/\.[a-zA-Z0-9]+$/, '') || null
  } catch {
    return null
  }
}

export const removeStoredImage = async (url) => {
  if (!url || typeof url !== 'string') return

  const publicId = cloudinaryPublicId(url)
  if (publicId && isCloudinaryEnabled()) {
    await cloudinary.uploader.destroy(publicId).catch(() => {})
    return
  }

  if (!url.startsWith('/uploads/')) return

  const relative = url.slice('/uploads/'.length)
  if (!relative || relative.includes('..')) return

  const absolute = path.resolve(uploadsRoot(), relative)
  const root = uploadsRoot()
  if (absolute !== root && !absolute.startsWith(root + path.sep)) return

  await fs.promises.unlink(absolute).catch(() => {})
}
