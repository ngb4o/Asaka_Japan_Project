import { StatusCodes } from 'http-status-codes'
import { tireService } from '~/services/tireService'

const actorName = (user) => String(user?.name || user?.username || '').trim()

const getList = async (req, res, next) => {
  try {
    const result = await tireService.getList(req.query)
    res.status(StatusCodes.OK).json({ message: 'Lấy sổ lốp thành công!', data: result })
  } catch (error) {
    next(error)
  }
}

const getOne = async (req, res, next) => {
  try {
    const result = await tireService.getOne(req.params.id)
    res.status(StatusCodes.OK).json({ message: 'Lấy lốp thành công!', data: result })
  } catch (error) {
    next(error)
  }
}

const createNew = async (req, res, next) => {
  try {
    const result = await tireService.createNew(req.body, actorName(req.user))
    res.status(StatusCodes.CREATED).json({ message: 'Đã thêm lốp!', data: result })
  } catch (error) {
    next(error)
  }
}

const mount = async (req, res, next) => {
  try {
    const result = await tireService.mountMany(req.body, actorName(req.user))
    res.status(StatusCodes.CREATED).json({ message: 'Đã gắn lốp!', data: result })
  } catch (error) {
    next(error)
  }
}

const correct = async (req, res, next) => {
  try {
    const result = await tireService.correct(req.params.id, req.body)
    res.status(StatusCodes.OK).json({ message: 'Đã sửa lốp!', data: result })
  } catch (error) {
    next(error)
  }
}

const move = async (req, res, next) => {
  try {
    const result = await tireService.move(req.params.id, req.body, actorName(req.user))
    res.status(StatusCodes.OK).json({ message: 'Đã chuyển lốp!', data: result })
  } catch (error) {
    next(error)
  }
}

export const tireController = {
  getList,
  getOne,
  createNew,
  mount,
  correct,
  move
}
