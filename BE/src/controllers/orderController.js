import { StatusCodes } from 'http-status-codes'
import { orderService } from '~/services/orderService'

const createNew = async (req, res, next) => {
  try {
    const result = await orderService.createNew(req.body, req.userId)

    res.status(StatusCodes.CREATED).json({
      message: 'Order created successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getList = async (req, res, next) => {
  try {
    const result = await orderService.getList(req.query)

    res.status(StatusCodes.OK).json({
      message: 'Get orders successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (req, res, next) => {
  try {
    const result = await orderService.getDetails(req.params.id)

    res.status(StatusCodes.OK).json({
      message: 'Get order details successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const result = await orderService.update(req.params.id, req.body, req.userId)

    res.status(StatusCodes.OK).json({
      message: 'Order updated successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteOne = async (req, res, next) => {
  try {
    const result = await orderService.deleteOne(req.params.id)

    res.status(StatusCodes.OK).json({
      message: result.message,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const orderController = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne
}
