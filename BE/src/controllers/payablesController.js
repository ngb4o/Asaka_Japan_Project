import { StatusCodes } from 'http-status-codes'
import { payablesService } from '~/services/payablesService'

const getSummary = async (req, res, next) => {
  try {
    const result = await payablesService.getSummary(req.query)
    res.status(StatusCodes.OK).json({
      message: 'Lấy công nợ nhà cung cấp thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const payablesController = {
  getSummary
}
