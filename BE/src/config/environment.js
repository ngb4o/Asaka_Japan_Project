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
}
