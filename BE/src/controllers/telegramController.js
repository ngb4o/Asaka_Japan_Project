import { StatusCodes } from 'http-status-codes'
import { telegramService } from '~/services/telegram/telegramService'

const getStatus = async (req, res, next) => {
  try {
    const data = await telegramService.getStatus()
    res.status(StatusCodes.OK).json({ message: 'Trạng thái Telegram bot', data })
  } catch (error) {
    next(error)
  }
}

const listContacts = async (req, res, next) => {
  try {
    const data = await telegramService.listContacts(req.query)
    res.status(StatusCodes.OK).json({ message: 'Danh sách liên hệ Telegram', data })
  } catch (error) {
    next(error)
  }
}

const upsertContact = async (req, res, next) => {
  try {
    const data = await telegramService.upsertContact(req.body)
    res.status(StatusCodes.OK).json({ message: 'Đã lưu liên hệ Telegram', data })
  } catch (error) {
    next(error)
  }
}

const deleteContact = async (req, res, next) => {
  try {
    const data = await telegramService.deleteContact(req.params.chatId)
    res.status(StatusCodes.OK).json({ message: data.message, data })
  } catch (error) {
    next(error)
  }
}

const sendTest = async (req, res, next) => {
  try {
    const data = await telegramService.sendTest(req.body)
    res.status(StatusCodes.OK).json({ message: 'Đã gửi tin thử', data })
  } catch (error) {
    next(error)
  }
}

const setWebhook = async (req, res, next) => {
  try {
    const data = await telegramService.setWebhook(req.body)
    res.status(StatusCodes.OK).json({ message: 'Đã đăng ký webhook Telegram', data })
  } catch (error) {
    next(error)
  }
}

const getWebhookInfo = async (req, res, next) => {
  try {
    const data = await telegramService.getWebhookInfo()
    res.status(StatusCodes.OK).json({ message: 'Thông tin webhook Telegram', data })
  } catch (error) {
    next(error)
  }
}

const webhook = async (req, res, next) => {
  try {
    const data = await telegramService.handleWebhook(req.body, req.headers)
    res.status(StatusCodes.OK).json(data)
  } catch (error) {
    next(error)
  }
}

export const telegramController = {
  getStatus,
  listContacts,
  upsertContact,
  deleteContact,
  sendTest,
  setWebhook,
  getWebhookInfo,
  webhook
}
