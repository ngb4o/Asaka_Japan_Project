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

const sendDealerReminderEmail = async (req, res, next) => {
  try {
    const result = await receivablesService.sendDealerReminderEmail(
      req.params.id,
      req.body
    )

    res.status(StatusCodes.OK).json({
      message: `Đã gửi nhắc nợ tới ${result.lastReminderSentTo || 'email đại lý'}.`,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const receivablesController = {
  getSummary,
  sendDealerReminderEmail
}
