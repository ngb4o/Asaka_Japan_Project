import { ObjectId } from 'mongodb'
import { StatusCodes } from 'http-status-codes'
import { GET_DB } from '~/config/mongodb'
import { rentalProposalModel } from '~/models/rentalProposalModel'
import ApiError from '~/utils/ApiError'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { OBJECT_ID_RULE } from '~/utils/validators'

const collection = () => GET_DB().collection(rentalProposalModel.RENTAL_PROPOSAL_COLLECTION_NAME)

const listDrafts = async () => {
  const items = await collection()
    .find({ status: { $in: ['draft', null] } })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(30)
    .toArray()
  return formatDocuments(items)
}

const getOne = async (id) => {
  if (!OBJECT_ID_RULE.test(String(id))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Id phiếu không hợp lệ')
  }
  const proposal = await collection().findOne({ _id: new ObjectId(id) })
  if (!proposal) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy bản nháp')
  return formatDocument(proposal)
}

const createRentalProposal = async (payload, createdBy) => {
  const created = await rentalProposalModel.createNew({
    reportDate: payload.reportDate,
    subject: payload.subject,
    content: payload.content,
    lines: payload.lines,
    createdBy: createdBy || '',
    status: 'draft'
  })
  return { id: created.insertedId.toString() }
}

const updateRentalProposal = async (id, payload) => {
  if (!OBJECT_ID_RULE.test(String(id))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Id phiếu không hợp lệ')
  }
  const result = await collection().updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        reportDate: payload.reportDate,
        subject: payload.subject,
        content: payload.content,
        lines: payload.lines,
        status: 'draft',
        updatedAt: new Date()
      }
    }
  )
  if (!result.matchedCount) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy bản nháp')
  return { id }
}

const deleteRentalProposal = async (id) => {
  if (!OBJECT_ID_RULE.test(String(id))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Id phiếu không hợp lệ')
  }
  const result = await collection().deleteOne({ _id: new ObjectId(id) })
  if (!result.deletedCount) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy bản nháp')
  return { id }
}

export const rentalProposalService = {
  listDrafts,
  getOne,
  createRentalProposal,
  updateRentalProposal,
  deleteRentalProposal
}
