import { StatusCodes } from 'http-status-codes'
import { purchaseService } from '~/services/purchaseService'

const getList = async (req, res, next) => {
  try {
    const result = await purchaseService.getList(req.query)
    res.status(StatusCodes.OK).json({
      message: 'Lấy danh sách phiếu nhập mua thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (req, res, next) => {
  try {
    const result = await purchaseService.getDetails(req.params.id)
    res.status(StatusCodes.OK).json({
      message: 'Lấy chi tiết phiếu nhập mua thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const recordPayment = async (req, res, next) => {
  try {
    const result = await purchaseService.recordPayment(req.params.id, req.body)
    res.status(StatusCodes.OK).json({
      message: 'Đã ghi nhận thanh toán NCC!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const purchaseController = {
  getList,
  getDetails,
  recordPayment
}
