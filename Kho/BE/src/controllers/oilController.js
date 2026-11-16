import { StatusCodes } from 'http-status-codes'
import { oilService } from '~/services/oilService'

const actorName = (user) => String(user?.name || user?.username || '').trim()

const getList = async (req, res, next) => {
  try {
    const result = await oilService.getList()
    res.status(StatusCodes.OK).json({ message: 'Lấy sổ thay dầu thành công!', data: result })
  } catch (error) {
    next(error)
  }
}

const getOne = async (req, res, next) => {
  try {
    const result = await oilService.getOne(req.params.driverId)
    res.status(StatusCodes.OK).json({ message: 'Lấy xe thành công!', data: result })
  } catch (error) {
    next(error)
  }
}

const setKm = async (req, res, next) => {
  try {
    const result = await oilService.setKm(req.params.driverId, req.body)
    res.status(StatusCodes.OK).json({ message: 'Đã lưu km hiện tại!', data: result })
  } catch (error) {
    next(error)
  }
}

const recordChange = async (req, res, next) => {
  try {
    const result = await oilService.recordChange(req.params.driverId, req.body, actorName(req.user))
    res.status(StatusCodes.CREATED).json({ message: 'Đã ghi lần thay dầu!', data: result })
  } catch (error) {
    next(error)
  }
}

export const oilController = {
  getList,
  getOne,
  setKm,
  recordChange
}
