import { StatusCodes } from 'http-status-codes'
import { dashboardService } from '~/services/dashboardService'

const getSummary = async (req, res, next) => {
  try {
    const result = await dashboardService.getSummary()

    res.status(StatusCodes.OK).json({
      message: 'Lấy tổng quan dashboard thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const dashboardController = {
  getSummary
}
