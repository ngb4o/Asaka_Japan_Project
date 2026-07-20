import { StatusCodes } from 'http-status-codes'
import { notificationService } from '~/services/notificationService'

const getList = async (req, res, next) => {
  try {
    const result = await notificationService.getList(req.userId)

    res.status(StatusCodes.OK).json({
      message: 'Get notifications successfully!',
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
      message: 'Notifications marked as read!',
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
