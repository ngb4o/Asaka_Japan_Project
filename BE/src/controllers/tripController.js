import { StatusCodes } from 'http-status-codes'
import { tripService } from '~/services/tripService'

const createNew = async (req, res, next) => {
  try {
    const result = await tripService.createNew(req.body, req.userId)
    res.status(StatusCodes.CREATED).json({
      message: 'Đã tạo chuyến công tác thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getList = async (req, res, next) => {
  try {
    const result = await tripService.getList(req.query)
    res.status(StatusCodes.OK).json({
      message: 'Lấy danh sách chuyến công tác thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (req, res, next) => {
  try {
    const result = await tripService.getDetails(req.params.id)
    res.status(StatusCodes.OK).json({
      message: 'Lấy chi tiết chuyến công tác thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const result = await tripService.update(
      req.params.id,
      req.body,
      req.userId,
      req.userRole
    )
    res.status(StatusCodes.OK).json({
      message: 'Đã cập nhật chuyến công tác thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteOne = async (req, res, next) => {
  try {
    const result = await tripService.deleteOne(req.params.id)
    res.status(StatusCodes.OK).json({
      message: result.message,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const addStop = async (req, res, next) => {
  try {
    const result = await tripService.addStop(
      req.params.id,
      req.body,
      req.userId,
      req.userRole
    )
    res.status(StatusCodes.OK).json({ message: 'Đã thêm điểm dừng!', data: result })
  } catch (error) {
    next(error)
  }
}

const removeStop = async (req, res, next) => {
  try {
    const result = await tripService.removeStop(
      req.params.id,
      req.params.stopId,
      req.userId,
      req.userRole
    )
    res.status(StatusCodes.OK).json({ message: 'Đã xóa điểm dừng!', data: result })
  } catch (error) {
    next(error)
  }
}

const addAdvance = async (req, res, next) => {
  try {
    const result = await tripService.addAdvance(req.params.id, req.body, req.userId)
    res.status(StatusCodes.OK).json({ message: 'Đã ghi nhận tạm ứng!', data: result })
  } catch (error) {
    next(error)
  }
}

const addExpense = async (req, res, next) => {
  try {
    const result = await tripService.addExpense(
      req.params.id,
      req.body,
      req.userId,
      req.userRole
    )
    res.status(StatusCodes.OK).json({ message: 'Đã thêm khoản chi!', data: result })
  } catch (error) {
    next(error)
  }
}

const reviewExpense = async (req, res, next) => {
  try {
    const result = await tripService.reviewExpense(
      req.params.id,
      req.params.expenseId,
      req.body,
      req.userId
    )
    res.status(StatusCodes.OK).json({ message: 'Đã duyệt khoản chi!', data: result })
  } catch (error) {
    next(error)
  }
}

const settle = async (req, res, next) => {
  try {
    const result = await tripService.settle(req.params.id, req.body, req.userId)
    res.status(StatusCodes.OK).json({ message: 'Đã quyết toán chuyến!', data: result })
  } catch (error) {
    next(error)
  }
}

export const tripController = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne,
  addStop,
  removeStop,
  addAdvance,
  addExpense,
  reviewExpense,
  settle
}
