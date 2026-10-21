/* eslint-disable no-console */
import express from 'express'
import path from 'path'
import exitHook from 'async-exit-hook'
import { CONNECT_DB, CLOSE_DB } from '~/config/mongodb'
import { env } from '~/config/environment'
import { APIs_V1 } from '~/routes/v1'
import { errorHandlingMiddleware } from '~/middlewares/errorHandlingMiddleware'
import { itemModel } from '~/models/itemModel'

const isDevOrigin = (origin) => {
  if (env.BUILD_MODE !== 'dev') return false

  try {
    const { hostname } = new URL(origin)
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.local') ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
    )
  } catch {
    return false
  }
}

const START_SERVER = () => {
  const app = express()

  app.use((req, res, next) => {
    const origin = req.headers.origin
    const allowed = Boolean(origin) && (env.CORS_ORIGINS.includes(origin) || isDevOrigin(origin))

    if (allowed) {
      res.header('Access-Control-Allow-Origin', origin)
      res.header('Vary', 'Origin')
    }

    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')

    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  app.use(express.json())
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))
  app.use('/api/v1', APIs_V1)
  app.use(errorHandlingMiddleware)

  const host = env.APP_HOST
  const port = Number(process.env.PORT || env.APP_PORT || 8018)

  app.listen(port, host, () => {
    console.log(`Kho API running at http://${host}:${port}/api/v1`)
  })

  exitHook(() => {
    CLOSE_DB()
  })
}

CONNECT_DB()
  .then(() => itemModel.ensureIndexes())
  .then(() => {
    console.log('Connected to MongoDB')
    START_SERVER()
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
