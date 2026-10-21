import fs from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'
import { cloudinary, isCloudinaryEnabled } from '~/config/cloudinary'

const SAFE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

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
  if (isCloudinaryEnabled()) return uploadToCloudinary(file, folderName)
  return saveLocalImage(file, folderName)
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
