import { StatusCodes } from 'http-status-codes'
import { officeProposalService } from '~/services/officeProposalService'

const list = async (req, res, next) => {
  try {
    const result = await officeProposalService.listDrafts()
    res.status(StatusCodes.OK).json({ message: 'Lấy danh sách bản nháp thành công!', data: result })
  } catch (error) {
    next(error)
  }
}

const getOne = async (req, res, next) => {
  try {
    const result = await officeProposalService.getOne(req.params.id)
    res.status(StatusCodes.OK).json({ message: 'Lấy bản nháp thành công!', data: result })
  } catch (error) {
    next(error)
  }
}

const create = async (req, res, next) => {
  try {
    const result = await officeProposalService.createOfficeProposal(
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
    const result = await officeProposalService.updateOfficeProposal(req.params.id, req.body)
    res.status(StatusCodes.OK).json({ message: 'Đã lưu bản nháp!', data: result })
  } catch (error) {
    next(error)
  }
}

const remove = async (req, res, next) => {
  try {
    const result = await officeProposalService.deleteOfficeProposal(req.params.id)
    res.status(StatusCodes.OK).json({ message: 'Đã xóa bản nháp!', data: result })
  } catch (error) {
    next(error)
  }
}

export const officeProposalController = {
  list,
  getOne,
  create,
  update,
  remove
}
