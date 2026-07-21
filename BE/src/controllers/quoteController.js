import { StatusCodes } from 'http-status-codes'
import { quoteService } from '~/services/quoteService'

const createNew = async (req, res, next) => {
  try {
    const result = await quoteService.createNew(req.body, req.userId)

    res.status(StatusCodes.CREATED).json({
      message: 'Đã tạo báo giá thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getList = async (req, res, next) => {
  try {
    const result = await quoteService.getList(req.query)

    res.status(StatusCodes.OK).json({
      message: 'Lấy danh sách báo giá thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (req, res, next) => {
  try {
    const result = await quoteService.getDetails(req.params.id)

    res.status(StatusCodes.OK).json({
      message: 'Lấy chi tiết báo giá thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const result = await quoteService.update(req.params.id, req.body)

    res.status(StatusCodes.OK).json({
      message: 'Đã cập nhật báo giá thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteOne = async (req, res, next) => {
  try {
    const result = await quoteService.deleteOne(req.params.id)

    res.status(StatusCodes.OK).json({
      message: result.message,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const convertToOrder = async (req, res, next) => {
  try {
    const result = await quoteService.convertToOrder(req.params.id, req.body, req.userId)

    res.status(StatusCodes.CREATED).json({
      message: 'Đã chuyển báo giá thành đơn hàng thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const quoteController = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne,
  convertToOrder
}
