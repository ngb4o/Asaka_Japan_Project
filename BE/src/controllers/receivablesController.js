import { StatusCodes } from 'http-status-codes'
import { receivablesService } from '~/services/receivablesService'

const getSummary = async (req, res, next) => {
  try {
    const result = await receivablesService.getSummary(req.query)

    res.status(StatusCodes.OK).json({
      message: 'Lấy sổ công nợ thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const receivablesController = {
  getSummary
}
