import { StatusCodes } from 'http-status-codes'
import { warehouseService } from '~/services/warehouseService'

const createNew = async (req, res, next) => {
  try {
    const result = await warehouseService.createNew(req.body, req.userId)

    res.status(StatusCodes.CREATED).json({
      message: 'Đã tạo kho hàng thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getList = async (req, res, next) => {
  try {
    const result = await warehouseService.getList(req.query)

    res.status(StatusCodes.OK).json({
      message: 'Lấy danh sách kho thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (req, res, next) => {
  try {
    const result = await warehouseService.getDetails(req.params.id)

    res.status(StatusCodes.OK).json({
      message: 'Lấy chi tiết kho thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const result = await warehouseService.update(req.params.id, req.body)

    res.status(StatusCodes.OK).json({
      message: 'Đã cập nhật kho hàng thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteOne = async (req, res, next) => {
  try {
    const result = await warehouseService.deleteOne(req.params.id)

    res.status(StatusCodes.OK).json({
      message: result.message,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const warehouseController = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne
}
