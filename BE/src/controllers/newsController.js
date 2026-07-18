import { StatusCodes } from 'http-status-codes'
import { newsService } from '~/services/newsService'

const createNew = async (req, res, next) => {
  try {
    const result = await newsService.createNew(req.body, req.userId)

    res.status(StatusCodes.CREATED).json({
      message: 'News created successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getList = async (req, res, next) => {
  try {
    const result = await newsService.getList(req.query)

    res.status(StatusCodes.OK).json({
      message: 'Get news successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (req, res, next) => {
  try {
    const result = await newsService.getDetails(req.params.id)

    res.status(StatusCodes.OK).json({
      message: 'Get news details successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const result = await newsService.update(req.params.id, req.body)

    res.status(StatusCodes.OK).json({
      message: 'News updated successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteOne = async (req, res, next) => {
  try {
    const result = await newsService.deleteOne(req.params.id)

    res.status(StatusCodes.OK).json({
      message: result.message,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const newsController = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne
}
