import { StatusCodes } from 'http-status-codes'
import { webPushService } from '~/services/webPushService'

const getVapidPublicKey = async (req, res, next) => {
  try {
    const publicKey = webPushService.getPublicKey()
    if (!publicKey) {
      return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        message: 'Web Push chưa được cấu hình',
        data: { enabled: false, publicKey: null }
      })
    }

    res.status(StatusCodes.OK).json({
      message: 'VAPID public key',
      data: { enabled: true, publicKey }
    })
  } catch (error) {
    next(error)
  }
}

const getPushStatus = async (req, res, next) => {
  try {
    const data = await webPushService.getStatusForUser(req.userId)
    res.status(StatusCodes.OK).json({
      message: 'Trạng thái Web Push',
      data
    })
  } catch (error) {
    next(error)
  }
}

const subscribe = async (req, res, next) => {
  try {
    const data = await webPushService.subscribe(
      req.userId,
      req.body?.subscription || req.body,
      req.get('user-agent') || ''
    )
    res.status(StatusCodes.OK).json({
      message: 'Đã bật thông báo đẩy',
      data
    })
  } catch (error) {
    next(error)
  }
}

const unsubscribe = async (req, res, next) => {
  try {
    const endpoint = req.body?.endpoint
    if (!endpoint) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Thiếu endpoint'
      })
    }
    const data = await webPushService.unsubscribe(req.userId, endpoint)
    res.status(StatusCodes.OK).json({
      message: 'Đã tắt thông báo đẩy trên thiết bị này',
      data
    })
  } catch (error) {
    next(error)
  }
}

export const pushController = {
  getVapidPublicKey,
  getPushStatus,
  subscribe,
  unsubscribe
}
