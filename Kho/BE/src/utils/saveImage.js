import fs from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'

const SAFE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

const uploadsRoot = () => path.resolve(process.cwd(), 'uploads')

export const saveLocalImage = async (file, folderName) => {
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

export const removeStoredImage = async (url) => {
  if (!url || typeof url !== 'string' || !url.startsWith('/uploads/')) return

  const relative = url.slice('/uploads/'.length)
  if (!relative || relative.includes('..')) return

  const absolute = path.resolve(uploadsRoot(), relative)
  const root = uploadsRoot()
  if (absolute !== root && !absolute.startsWith(root + path.sep)) return

  await fs.promises.unlink(absolute).catch(() => {})
}
