import { StatusCodes } from 'http-status-codes'
import { productService } from '~/services/productService'

const createNew = async (req, res, next) => {
  try {
    const result = await productService.createNew(req.body, req.userId)

    res.status(StatusCodes.CREATED).json({
      message: 'Product created successfully!',
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
      message: 'Get products successfully!',
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
      message: 'Get product details successfully!',
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
      message: 'Product updated successfully!',
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
