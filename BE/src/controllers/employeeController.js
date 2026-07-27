import { StatusCodes } from 'http-status-codes'
import { employeeService } from '~/services/employeeService'

const createNew = async (req, res, next) => {
  try {
    const result = await employeeService.createNew(req.body, req.userId)
    res.status(StatusCodes.CREATED).json({
      message: 'Đã tạo nhân viên thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getList = async (req, res, next) => {
  try {
    const result = await employeeService.getList(req.query)
    res.status(StatusCodes.OK).json({
      message: 'Lấy danh sách nhân viên thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (req, res, next) => {
  try {
    const result = await employeeService.getDetails(req.params.id)
    res.status(StatusCodes.OK).json({
      message: 'Lấy chi tiết nhân viên thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const result = await employeeService.update(req.params.id, req.body)
    res.status(StatusCodes.OK).json({
      message: 'Đã cập nhật nhân viên thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteOne = async (req, res, next) => {
  try {
    const result = await employeeService.deleteOne(req.params.id)
    res.status(StatusCodes.OK).json({
      message: result.message,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const employeeController = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne
}
