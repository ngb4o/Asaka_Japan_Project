import { StatusCodes } from 'http-status-codes'
import { dealerService } from '~/services/dealerService'

const createNew = async (req, res, next) => {
  try {
    const result = await dealerService.createNew(req.body, req.userId)

    res.status(StatusCodes.CREATED).json({
      message: 'Dealer created successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getList = async (req, res, next) => {
  try {
    const result = await dealerService.getList(req.query)

    res.status(StatusCodes.OK).json({
      message: 'Get dealers successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (req, res, next) => {
  try {
    const result = await dealerService.getDetails(req.params.id)

    res.status(StatusCodes.OK).json({
      message: 'Get dealer details successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const result = await dealerService.update(req.params.id, req.body)

    res.status(StatusCodes.OK).json({
      message: 'Dealer updated successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteOne = async (req, res, next) => {
  try {
    const result = await dealerService.deleteOne(req.params.id)

    res.status(StatusCodes.OK).json({
      message: result.message,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const dealerController = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne
}
