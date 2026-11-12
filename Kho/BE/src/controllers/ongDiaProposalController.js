import { StatusCodes } from 'http-status-codes'
import { ongDiaProposalService } from '~/services/ongDiaProposalService'

const list = async (req, res, next) => {
  try {
    const result = await ongDiaProposalService.listDrafts()
    res.status(StatusCodes.OK).json({ message: 'Lấy danh sách bản nháp thành công!', data: result })
  } catch (error) {
    next(error)
  }
}

const getOne = async (req, res, next) => {
  try {
    const result = await ongDiaProposalService.getOne(req.params.id)
    res.status(StatusCodes.OK).json({ message: 'Lấy bản nháp thành công!', data: result })
  } catch (error) {
    next(error)
  }
}

const create = async (req, res, next) => {
  try {
    const result = await ongDiaProposalService.createOngDiaProposal(
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
    const result = await ongDiaProposalService.updateOngDiaProposal(req.params.id, req.body)
    res.status(StatusCodes.OK).json({ message: 'Đã lưu bản nháp!', data: result })
  } catch (error) {
    next(error)
  }
}

const remove = async (req, res, next) => {
  try {
    const result = await ongDiaProposalService.deleteOngDiaProposal(req.params.id)
    res.status(StatusCodes.OK).json({ message: 'Đã xóa bản nháp!', data: result })
  } catch (error) {
    next(error)
  }
}

export const ongDiaProposalController = {
  list,
  getOne,
  create,
  update,
  remove
}
