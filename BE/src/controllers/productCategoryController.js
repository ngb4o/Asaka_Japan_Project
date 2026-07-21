import { StatusCodes } from 'http-status-codes'
import { productCategoryService } from '~/services/productCategoryService'

const createNew = async (req, res, next) => {
  try {
    const result = await productCategoryService.createNew(req.body, req.userId)

    res.status(StatusCodes.CREATED).json({
      message: 'Đã tạo loại sản phẩm thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getList = async (req, res, next) => {
  try {
    const result = await productCategoryService.getList(req.query)

    res.status(StatusCodes.OK).json({
      message: 'Lấy danh sách loại sản phẩm thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (req, res, next) => {
  try {
    const result = await productCategoryService.getDetails(req.params.id)

    res.status(StatusCodes.OK).json({
      message: 'Lấy chi tiết loại sản phẩm thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const result = await productCategoryService.update(req.params.id, req.body)

    res.status(StatusCodes.OK).json({
      message: 'Đã cập nhật loại sản phẩm thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteOne = async (req, res, next) => {
  try {
    const result = await productCategoryService.deleteOne(req.params.id)

    res.status(StatusCodes.OK).json({
      message: result.message,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const productCategoryController = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne
}
