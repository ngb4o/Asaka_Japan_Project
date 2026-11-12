import { StatusCodes } from 'http-status-codes'
import { officePdfService } from '~/services/officePdfService'

const create = async (req, res, next) => {
  try {
    const pdf = await officePdfService.createPdf(req.body)
    res.status(StatusCodes.OK)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline; filename="phieu.pdf"')
    res.send(pdf)
  } catch (error) {
    next(error)
  }
}

export const officePdfController = {
  create
}
