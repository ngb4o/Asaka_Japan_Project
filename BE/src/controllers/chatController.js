import { StatusCodes } from 'http-status-codes'
import { chatService } from '~/services/chat/chatService'

const initSse = (res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  if (typeof res.flushHeaders === 'function') res.flushHeaders()
}

const streamMessage = async (req, res, next) => {
  try {
    initSse(res)
    await chatService.streamMessage({
      res,
      userId: req.userId,
      roles: req.userRoles || [],
      messages: req.body?.messages || [],
      clientMessage: req.body?.message || req.body?.clientMessage || '',
      imageUrl: req.body?.imageUrl || ''
    })
    res.end()
  } catch (error) {
    if (res.headersSent) {
      try {
        chatService.sseWrite(res, 'error', {
          message: error?.message || 'Chat failed'
        })
        res.end()
      } catch {
        /* ignore */
      }
      return
    }
    next(error)
  }
}

const confirm = async (req, res, next) => {
  try {
    const result = await chatService.confirmAction({
      userId: req.userId,
      token: req.body?.token,
      accept: Boolean(req.body?.accept)
    })
    res.status(StatusCodes.OK).json({
      message: result.message,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const cancel = async (req, res, next) => {
  try {
    const result = await chatService.confirmAction({
      userId: req.userId,
      token: req.body?.token,
      accept: false
    })
    res.status(StatusCodes.OK).json({
      message: result.message,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const chatController = {
  streamMessage,
  confirm,
  cancel
}
