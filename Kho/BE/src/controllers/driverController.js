import { StatusCodes } from 'http-status-codes'
import { driverService } from '~/services/driverService'

const getList = async (req, res, next) => {
  try {
    const result = await driverService.getList(req.query)
    res.status(StatusCodes.OK).json({ message: 'Lấy danh sách lái xe thành công!', data: result })
  } catch (error) {
    next(error)
  }
}

const createNew = async (req, res, next) => {
  try {
    const result = await driverService.createNew(req.body)
    res.status(StatusCodes.CREATED).json({ message: 'Đã thêm lái xe!', data: result })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const result = await driverService.update(req.params.id, req.body)
    res.status(StatusCodes.OK).json({ message: 'Đã cập nhật lái xe!', data: result })
  } catch (error) {
    next(error)
  }
}

const deleteOne = async (req, res, next) => {
  try {
    const result = await driverService.deleteOne(req.params.id)
    res.status(StatusCodes.OK).json({ message: 'Đã xóa lái xe!', data: result })
  } catch (error) {
    next(error)
  }
}

export const driverController = {
  getList,
  createNew,
  update,
  deleteOne
}
