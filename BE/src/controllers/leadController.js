import { StatusCodes } from 'http-status-codes'
import { leadService } from '~/services/leadService'

const createPublic = async (req, res, next) => {
  try {
    const result = await leadService.createPublic(req.body)

    res.status(StatusCodes.CREATED).json({
      message: 'Lead submitted successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getList = async (req, res, next) => {
  try {
    const result = await leadService.getList(req.query)

    res.status(StatusCodes.OK).json({
      message: 'Get leads successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (req, res, next) => {
  try {
    const result = await leadService.getDetails(req.params.id)

    res.status(StatusCodes.OK).json({
      message: 'Get lead details successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const result = await leadService.update(req.params.id, req.body)

    res.status(StatusCodes.OK).json({
      message: 'Lead updated successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteOne = async (req, res, next) => {
  try {
    const result = await leadService.deleteOne(req.params.id)

    res.status(StatusCodes.OK).json({
      message: result.message,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const convertToDealer = async (req, res, next) => {
  try {
    const result = await leadService.convertToDealer(req.params.id, req.userId)

    res.status(StatusCodes.CREATED).json({
      message: 'Lead converted to dealer successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const leadController = {
  createPublic,
  getList,
  getDetails,
  update,
  deleteOne,
  convertToDealer
}
