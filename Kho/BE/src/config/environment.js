import 'dotenv/config'

export const env = {
  MONGODB_URI: process.env.MONGODB_URI,
  DATABASE_NAME: process.env.DATABASE_NAME || 'kho',
  APP_HOST: process.env.APP_HOST || '0.0.0.0',
  APP_PORT: process.env.APP_PORT || 8018,
  BUILD_MODE: process.env.BUILD_MODE,
  AUTHOR: process.env.AUTHOR || 'KHO',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CORS_ORIGINS: (process.env.CORS_ORIGIN || 'http://localhost:3002,http://127.0.0.1:3002')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}
