import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { authRoute } from '~/routes/v1/authRoute'
import { itemRoute } from '~/routes/v1/itemRoute'
import { movementRoute } from '~/routes/v1/movementRoute'
import { verifyToken } from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'Kho API is ready' })
})

Router.use('/auth', authRoute)
Router.use('/items', verifyToken, itemRoute)
Router.use('/movements', verifyToken, movementRoute)

export const APIs_V1 = Router
