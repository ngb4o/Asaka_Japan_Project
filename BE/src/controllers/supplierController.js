import { StatusCodes } from 'http-status-codes'
import { supplierService } from '~/services/supplierService'

const createNew = async (req, res, next) => {
  try {
    const result = await supplierService.createNew(req.body, req.userId)
    res.status(StatusCodes.CREATED).json({
      message: 'Đã tạo nhà cung cấp thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getList = async (req, res, next) => {
  try {
    const result = await supplierService.getList(req.query)
    res.status(StatusCodes.OK).json({
      message: 'Lấy danh sách nhà cung cấp thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (req, res, next) => {
  try {
    const result = await supplierService.getDetails(req.params.id)
    res.status(StatusCodes.OK).json({
      message: 'Lấy chi tiết nhà cung cấp thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const result = await supplierService.update(req.params.id, req.body)
    res.status(StatusCodes.OK).json({
      message: 'Đã cập nhật nhà cung cấp thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteOne = async (req, res, next) => {
  try {
    const result = await supplierService.deleteOne(req.params.id)
    res.status(StatusCodes.OK).json({
      message: result.message,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const supplierController = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne
}
