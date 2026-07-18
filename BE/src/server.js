/* eslint-disable no-console */
import express from 'express'
import path from 'path'
import exitHook from 'async-exit-hook'
import { CONNECT_DB, CLOSE_DB } from '~/config/mongodb'
import { env } from '~/config/environment'
import { APIs_V1 } from '~/routes/v1'
import { errorHandlingMiddleware } from '~/middlewares/errorHandlingMiddleware'

const START_SERVER = () => {
  const app = express()

  app.use((req, res, next) => {
    const origin = req.headers.origin

    if (origin && env.CORS_ORIGINS.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin)
      res.header('Vary', 'Origin')
    }

    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204)
    }

    next()
  })

  app.use(express.json())
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

  app.use('/api', APIs_V1)

  app.use(errorHandlingMiddleware)

  app.listen(env.APP_PORT, env.APP_HOST, () => {
    console.log(`Hi ${env.AUTHOR}, CRM API running at http://${env.APP_HOST}:${env.APP_PORT}/api`)
  })

  exitHook(() => {
    CLOSE_DB()
  })
}

CONNECT_DB()
  .then(() => {
    console.log('Connected to MongoDB Cloud Atlas')
    START_SERVER()
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
