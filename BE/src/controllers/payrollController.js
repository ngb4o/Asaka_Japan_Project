import { StatusCodes } from 'http-status-codes'
import { payrollService } from '~/services/payrollService'

const actorRolesOf = (req) => req.userRoles || (req.userRole ? [req.userRole] : [])

const getList = async (req, res, next) => {
  try {
    const result = await payrollService.getList(
      req.query,
      req.userId,
      actorRolesOf(req)
    )
    res.status(StatusCodes.OK).json({
      message: 'Lấy danh sách bảng lương thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (req, res, next) => {
  try {
    const result = await payrollService.getDetails(
      req.params.id,
      req.userId,
      actorRolesOf(req)
    )
    res.status(StatusCodes.OK).json({
      message: 'Lấy chi tiết bảng lương thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const generate = async (req, res, next) => {
  try {
    const result = await payrollService.generate(
      req.body.period,
      req.userId,
      req.body.note || ''
    )
    res.status(StatusCodes.OK).json({
      message: 'Đã tạo/cập nhật bảng lương!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const lock = async (req, res, next) => {
  try {
    const result = await payrollService.lock(req.params.id, req.userId)
    res.status(StatusCodes.OK).json({
      message: 'Đã khóa bảng lương!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteOne = async (req, res, next) => {
  try {
    const result = await payrollService.deleteOne(req.params.id)
    res.status(StatusCodes.OK).json({
      message: result.message,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const payrollController = {
  getList,
  getDetails,
  generate,
  lock,
  deleteOne
}
