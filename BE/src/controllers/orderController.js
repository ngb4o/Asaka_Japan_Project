import { StatusCodes } from 'http-status-codes'
import { orderService } from '~/services/orderService'

const createNew = async (req, res, next) => {
  try {
    const result = await orderService.createNew(req.body, req.userId)

    res.status(StatusCodes.CREATED).json({
      message: 'Đã tạo đơn hàng thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getList = async (req, res, next) => {
  try {
    const result = await orderService.getList(req.query)

    res.status(StatusCodes.OK).json({
      message: 'Lấy danh sách đơn hàng thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (req, res, next) => {
  try {
    const result = await orderService.getDetails(req.params.id)

    res.status(StatusCodes.OK).json({
      message: 'Lấy chi tiết đơn hàng thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getAudits = async (req, res, next) => {
  try {
    const result = await orderService.getAudits(req.params.id)

    res.status(StatusCodes.OK).json({
      message: 'Lấy lịch sử đơn hàng thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const result = await orderService.update(req.params.id, req.body, req.userId)

    res.status(StatusCodes.OK).json({
      message: 'Đã cập nhật đơn hàng thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteOne = async (req, res, next) => {
  try {
    const result = await orderService.deleteOne(req.params.id, req.userId)

    res.status(StatusCodes.OK).json({
      message: result.message,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const recordPayment = async (req, res, next) => {
  try {
    const result = await orderService.recordPayment(req.params.id, req.body, {
      actorUserId: req.userId
    })

    res.status(StatusCodes.OK).json({
      message: 'Đã ghi nhận thanh toán thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const sendInvoiceEmail = async (req, res, next) => {
  try {
    const result = await orderService.sendInvoiceEmail(
      req.params.id,
      req.body,
      req.userId
    )

    res.status(StatusCodes.OK).json({
      message: `Đã gửi hóa đơn tới ${result.invoiceEmailSentTo || 'email khách'}.`,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const orderController = {
  createNew,
  getList,
  getDetails,
  getAudits,
  update,
  recordPayment,
  sendInvoiceEmail,
  deleteOne
}
