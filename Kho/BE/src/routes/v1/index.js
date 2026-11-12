import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { authRoute } from '~/routes/v1/authRoute'
import { driverRoute } from '~/routes/v1/driverRoute'
import { itemRoute } from '~/routes/v1/itemRoute'
import { movementRoute } from '~/routes/v1/movementRoute'
import { proposalRoute } from '~/routes/v1/proposalRoute'
import { slipRoute } from '~/routes/v1/slipRoute'
import { electricProposalRoute } from '~/routes/v1/electricProposalRoute'
import { officeProposalRoute } from '~/routes/v1/officeProposalRoute'
import { weldProposalRoute } from '~/routes/v1/weldProposalRoute'
import { viettelProposalRoute } from '~/routes/v1/viettelProposalRoute'
import { utilityProposalRoute } from '~/routes/v1/utilityProposalRoute'
import { rentalProposalRoute } from '~/routes/v1/rentalProposalRoute'
import { ongDiaProposalRoute } from '~/routes/v1/ongDiaProposalRoute'
import { phucVinhProposalRoute } from '~/routes/v1/phucVinhProposalRoute'
import { tireProposalRoute } from '~/routes/v1/tireProposalRoute'
import { verifyToken } from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'Kho API is ready' })
})

Router.use('/auth', authRoute)
Router.use('/items', verifyToken, itemRoute)
Router.use('/drivers', verifyToken, driverRoute)
Router.use('/movements', verifyToken, movementRoute)
Router.use('/slips', verifyToken, slipRoute)
Router.use('/proposals', verifyToken, proposalRoute)
Router.use('/tire-proposals', verifyToken, tireProposalRoute)
Router.use('/electric-proposals', verifyToken, electricProposalRoute)
Router.use('/phuc-vinh-proposals', verifyToken, phucVinhProposalRoute)
Router.use('/office-proposals', verifyToken, officeProposalRoute)
Router.use('/weld-proposals', verifyToken, weldProposalRoute)
Router.use('/viettel-proposals', verifyToken, viettelProposalRoute)
Router.use('/utility-proposals', verifyToken, utilityProposalRoute)
Router.use('/rental-proposals', verifyToken, rentalProposalRoute)
Router.use('/ong-dia-proposals', verifyToken, ongDiaProposalRoute)

export const APIs_V1 = Router
