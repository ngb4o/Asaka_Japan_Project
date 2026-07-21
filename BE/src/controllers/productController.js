import { StatusCodes } from 'http-status-codes'
import { productService } from '~/services/productService'

const createNew = async (req, res, next) => {
  try {
    const result = await productService.createNew(req.body, req.userId)

    res.status(StatusCodes.CREATED).json({
      message: 'Đã tạo sản phẩm thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getList = async (req, res, next) => {
  try {
    const result = await productService.getList(req.query)

    res.status(StatusCodes.OK).json({
      message: 'Lấy danh sách sản phẩm thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (req, res, next) => {
  try {
    const result = await productService.getDetails(req.params.id)

    res.status(StatusCodes.OK).json({
      message: 'Lấy chi tiết sản phẩm thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const result = await productService.update(req.params.id, req.body)

    res.status(StatusCodes.OK).json({
      message: 'Đã cập nhật sản phẩm thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteOne = async (req, res, next) => {
  try {
    const result = await productService.deleteOne(req.params.id)

    res.status(StatusCodes.OK).json({
      message: result.message,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const productController = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne
}
