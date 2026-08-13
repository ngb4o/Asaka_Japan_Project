import fs from 'fs'
import path from 'path'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

const MAX_BYTES = 8 * 1024 * 1024
const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
}

const isLocalHost = (hostname) =>
  !hostname ||
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname.endsWith('.local')

const cloudinaryThumb = (url) => {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.endsWith('res.cloudinary.com')) return url
    if (parsed.pathname.includes('/upload/')) {
      parsed.pathname = parsed.pathname.replace(
        '/upload/',
        '/upload/w_768,c_limit,q_70,f_jpg/'
      )
    }
    return parsed.href
  } catch {
    return url
  }
}

export const isAllowedChatImageUrl = (raw) => {
  const value = String(raw || '').trim()
  if (!value) return false
  if (value.startsWith('/uploads/')) return true
  try {
    const parsed = new URL(value)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    if (parsed.hostname.endsWith('res.cloudinary.com')) return true
    return false
  } catch {
    return false
  }
}

const localUploadPath = (raw) => {
  let pathname = String(raw || '').trim()
  try {
    if (/^https?:\/\//i.test(pathname)) {
      pathname = new URL(pathname).pathname
    }
  } catch {
    return null
  }
  if (!pathname.startsWith('/uploads/')) return null
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'uploads' || parts.length !== 3) return null
  if (parts.some((part) => part === '..' || part.includes('\\'))) return null
  return path.join(process.cwd(), ...parts)
}

const toDataUrl = async (filePath) => {
  const stat = await fs.promises.stat(filePath)
  if (stat.size > MAX_BYTES) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Ảnh quá nặng để AI đọc (tối đa 8MB). Chụp lại gần hơn hoặc giảm dung lượng.'
    )
  }
  const ext = path.extname(filePath).toLowerCase()
  const mime = MIME[ext] || 'image/jpeg'
  const buf = await fs.promises.readFile(filePath)
  return `data:${mime};base64,${buf.toString('base64')}`
}

/**
 * Turn a CRM upload URL into something Groq vision can fetch.
 * Public Cloudinary → URL. Local /uploads → base64 data URL.
 */
export const resolveVisionImage = async (raw) => {
  const value = String(raw || '').trim()
  if (!isAllowedChatImageUrl(value)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Ảnh không hợp lệ. Chỉ nhận ảnh vừa tải lên trong CRM.'
    )
  }

  if (value.startsWith('https://') || value.startsWith('http://')) {
    try {
      const parsed = new URL(value)
      if (!isLocalHost(parsed.hostname)) {
        return {
          storeUrl: value,
          visionUrl: cloudinaryThumb(value)
        }
      }
    } catch {
      /* fall through */
    }
  }

  const filePath = localUploadPath(value)
  if (!filePath) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Không đọc được ảnh local. Bật Cloudinary hoặc gửi lại ảnh.'
    )
  }

  try {
    await fs.promises.access(filePath, fs.constants.R_OK)
  } catch {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Không tìm thấy file ảnh trên server.'
    )
  }

  let storeUrl = value
  if (!storeUrl.startsWith('/')) {
    try {
      storeUrl = new URL(value).pathname
    } catch {
      storeUrl = value
    }
  }

  return {
    storeUrl,
    visionUrl: await toDataUrl(filePath)
  }
}
