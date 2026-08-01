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

const sendTest = async (req, res, next) => {
  try {
    const data = await webPushService.notifyUser(req.userId, {
      title: 'ASAKA CRM',
      body: 'Tin thử từ server — nếu thấy tin này thì iOS/Android đã nhận push.',
      url: '/dashboard',
      tag: 'asaka-push-test'
    })

    if (data?.skipped) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message:
          data.reason === 'no_subscribers'
            ? 'Chưa có thiết bị nào đăng ký push cho tài khoản này. Bật thông báo trên máy trước.'
            : 'Web Push chưa cấu hình VAPID trên server.',
        data
      })
    }

    res.status(StatusCodes.OK).json({
      message:
        data.sent > 0
          ? `Đã gửi tin thử tới ${data.sent}/${data.total} thiết bị`
          : 'Gửi thử không thành công — endpoint có thể hết hạn, hãy tắt rồi bật lại thông báo.',
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
  unsubscribe,
  sendTest
}
