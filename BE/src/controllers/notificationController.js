import { StatusCodes } from 'http-status-codes'
import { notificationService } from '~/services/notificationService'

const getList = async (req, res, next) => {
  try {
    const result = await notificationService.getList(req.userId)

    res.status(StatusCodes.OK).json({
      message: 'Lấy thông báo thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const markAllRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllRead(req.userId)

    res.status(StatusCodes.OK).json({
      message: 'Đã đánh dấu thông báo đã đọc!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const notificationController = {
  getList,
  markAllRead
}
