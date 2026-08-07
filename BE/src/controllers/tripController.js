import { StatusCodes } from 'http-status-codes'
import { tripService } from '~/services/tripService'

const actorRolesOf = (req) => req.userRoles || (req.userRole ? [req.userRole] : [])

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
    const result = await tripService.getList(req.query, req.userId, actorRolesOf(req))
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
    const result = await tripService.getDetails(
      req.params.id,
      req.userId,
      actorRolesOf(req)
    )
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
      actorRolesOf(req)
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
    const result = await tripService.deleteOne(
      req.params.id,
      req.userId,
      actorRolesOf(req)
    )
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
      actorRolesOf(req)
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
      actorRolesOf(req)
    )
    res.status(StatusCodes.OK).json({ message: 'Đã xóa điểm dừng!', data: result })
  } catch (error) {
    next(error)
  }
}

const reorderStops = async (req, res, next) => {
  try {
    const result = await tripService.reorderStops(
      req.params.id,
      req.body,
      req.userId,
      actorRolesOf(req)
    )
    res.status(StatusCodes.OK).json({ message: 'Đã sắp xếp lại lộ trình!', data: result })
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

const updateAdvance = async (req, res, next) => {
  try {
    const result = await tripService.updateAdvance(
      req.params.id,
      req.params.advanceId,
      req.body
    )
    res.status(StatusCodes.OK).json({ message: 'Đã cập nhật tạm ứng!', data: result })
  } catch (error) {
    next(error)
  }
}

const removeAdvance = async (req, res, next) => {
  try {
    const result = await tripService.removeAdvance(req.params.id, req.params.advanceId)
    res.status(StatusCodes.OK).json({ message: 'Đã xóa tạm ứng!', data: result })
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
      actorRolesOf(req)
    )
    res.status(StatusCodes.OK).json({ message: 'Đã thêm khoản chi!', data: result })
  } catch (error) {
    next(error)
  }
}

const updateExpense = async (req, res, next) => {
  try {
    const result = await tripService.updateExpense(
      req.params.id,
      req.params.expenseId,
      req.body,
      req.userId,
      actorRolesOf(req)
    )
    res.status(StatusCodes.OK).json({ message: 'Đã cập nhật khoản chi!', data: result })
  } catch (error) {
    next(error)
  }
}

const removeExpense = async (req, res, next) => {
  try {
    const result = await tripService.removeExpense(
      req.params.id,
      req.params.expenseId,
      req.userId,
      actorRolesOf(req)
    )
    res.status(StatusCodes.OK).json({ message: 'Đã xóa khoản chi!', data: result })
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
  reorderStops,
  addAdvance,
  updateAdvance,
  removeAdvance,
  addExpense,
  updateExpense,
  removeExpense,
  reviewExpense,
  settle
}
