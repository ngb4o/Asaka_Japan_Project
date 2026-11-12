import { StatusCodes } from 'http-status-codes'
import { slipService } from '~/services/slipService'

const list = async (req, res, next) => {
  try {
    const result = await slipService.listDrafts()
    res.status(StatusCodes.OK).json({ message: 'Lấy danh sách phiếu nháp thành công!', data: result })
  } catch (error) {
    next(error)
  }
}

const getOne = async (req, res, next) => {
  try {
    const result = await slipService.getExportSlip(req.params.id)
    res.status(StatusCodes.OK).json({ message: 'Lấy phiếu thành công!', data: result })
  } catch (error) {
    next(error)
  }
}

const create = async (req, res, next) => {
  try {
    const result = await slipService.createExportSlip(
      req.body,
      req.user?.name || req.user?.username || ''
    )
    res.status(StatusCodes.CREATED).json({ message: 'Đã lưu bản nháp!', data: result })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const result = await slipService.updateExportSlip(req.params.id, req.body)
    res.status(StatusCodes.OK).json({ message: 'Đã lưu bản nháp!', data: result })
  } catch (error) {
    next(error)
  }
}

const remove = async (req, res, next) => {
  try {
    const result = await slipService.deleteExportSlip(req.params.id)
    res.status(StatusCodes.OK).json({ message: 'Đã xóa bản nháp!', data: result })
  } catch (error) {
    next(error)
  }
}

export const slipController = {
  list,
  getOne,
  create,
  update,
  remove
}
