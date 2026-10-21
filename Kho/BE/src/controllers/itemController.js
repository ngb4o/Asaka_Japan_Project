import { StatusCodes } from 'http-status-codes'
import { itemService } from '~/services/itemService'

const getList = async (req, res, next) => {
  try {
    const result = await itemService.getList(req.query)

    res.status(StatusCodes.OK).json({
      message: 'Lấy danh sách sản phẩm thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const createNew = async (req, res, next) => {
  try {
    const result = await itemService.createNew(req.body)

    res.status(StatusCodes.CREATED).json({
      message: 'Đã thêm sản phẩm vào kho!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const result = await itemService.update(req.params.id, req.body)

    res.status(StatusCodes.OK).json({
      message: 'Đã cập nhật sản phẩm!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteOne = async (req, res, next) => {
  try {
    const result = await itemService.deleteOne(req.params.id)

    res.status(StatusCodes.OK).json({
      message: 'Đã xóa sản phẩm khỏi kho!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const itemController = {
  getList,
  createNew,
  update,
  deleteOne
}
