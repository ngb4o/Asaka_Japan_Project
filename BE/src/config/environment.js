import 'dotenv/config'

export const env = {
  MONGODB_URI: process.env.MONGODB_URI,
  DATABASE_NAME: process.env.DATABASE_NAME,

  APP_HOST: process.env.APP_HOST,
  APP_PORT: process.env.APP_PORT,

  BUILD_MODE: process.env.BUILD_MODE,

  AUTHOR: process.env.AUTHOR,

  JWT_SECRET: process.env.JWT_SECRET,

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  CORS_ORIGINS: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  // Apple Web Push prefers a real contact mailto/https (avoid .local)
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:crm@asaka.jp',

  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  /** Primary: smartest (70b). Fallbacks kick in when daily RPD/TPD exhausted. */
  GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  /** Comma-separated extras after GROQ_MODEL (default chain already includes 8b-instant) */
  GROQ_MODEL_FALLBACKS: process.env.GROQ_MODEL_FALLBACKS || 'llama-3.1-8b-instant',
  /** Vision (đọc ảnh bao bì). Groq: qwen/qwen3.6-27b */
  GROQ_VISION_MODEL: process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b',

  /** Geocode địa chỉ → GPS (cùng key Maps JS cũng được nếu bật Geocoding API) */
  GOOGLE_MAPS_API_KEY:
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_GEOCODING_API_KEY ||
    '',

  /** Invoice email — Resend (ưu tiên) hoặc SMTP */
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: process.env.SMTP_PORT || '587',
  SMTP_SECURE: process.env.SMTP_SECURE || '',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || '',
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME || 'ASAKA',
}
