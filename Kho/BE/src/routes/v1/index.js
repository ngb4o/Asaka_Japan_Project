import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { itemRoute } from '~/routes/v1/itemRoute'
import { movementRoute } from '~/routes/v1/movementRoute'

const Router = express.Router()

Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'Kho API is ready' })
})

Router.use('/items', itemRoute)
Router.use('/movements', movementRoute)

export const APIs_V1 = Router
