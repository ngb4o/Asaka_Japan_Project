import { ObjectId } from 'mongodb'
import { StatusCodes } from 'http-status-codes'
import { GET_DB } from '~/config/mongodb'
import { weldProposalModel } from '~/models/weldProposalModel'
import ApiError from '~/utils/ApiError'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { OBJECT_ID_RULE } from '~/utils/validators'

const collection = () => GET_DB().collection(weldProposalModel.WELD_PROPOSAL_COLLECTION_NAME)

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

const createWeldProposal = async (payload, createdBy) => {
  const created = await weldProposalModel.createNew({
    reportDate: payload.reportDate,
    subject: payload.subject,
    content: payload.content,
    lines: payload.lines,
    createdBy: createdBy || '',
    status: 'draft'
  })
  return { id: created.insertedId.toString() }
}

const updateWeldProposal = async (id, payload) => {
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

const deleteWeldProposal = async (id) => {
  if (!OBJECT_ID_RULE.test(String(id))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Id phiếu không hợp lệ')
  }
  const result = await collection().deleteOne({ _id: new ObjectId(id) })
  if (!result.deletedCount) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy bản nháp')
  return { id }
}

export const weldProposalService = {
  listDrafts,
  getOne,
  createWeldProposal,
  updateWeldProposal,
  deleteWeldProposal
}
