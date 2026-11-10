import { StatusCodes } from 'http-status-codes'
import { movementService } from '~/services/movementService'

const getList = async (req, res, next) => {
  try {
    const result = await movementService.getList(req.query)

    res.status(StatusCodes.OK).json({
      message: 'Lấy sổ xuất nhập thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getByItem = async (req, res, next) => {
  try {
    const result = await movementService.getList({ ...req.query, itemId: req.params.id })

    res.status(StatusCodes.OK).json({
      message: 'Lấy lịch sử xuất nhập thành công!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const create = async (req, res, next) => {
  try {
    const result = await movementService.record(req.params.id, {
      ...req.body,
      createdBy: req.user?.name || req.user?.username || ''
    })
    const verb = req.body.type === 'out' ? 'xuất' : 'nhập'

    res.status(StatusCodes.CREATED).json({
      message: `Đã ${verb} kho!`,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const movementController = {
  getList,
  getByItem,
  create
}
