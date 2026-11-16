import { ObjectId } from 'mongodb'
import { StatusCodes } from 'http-status-codes'
import { GET_DB } from '~/config/mongodb'
import { advanceProposalModel } from '~/models/advanceProposalModel'
import ApiError from '~/utils/ApiError'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { OBJECT_ID_RULE } from '~/utils/validators'

const collection = () => GET_DB().collection(advanceProposalModel.ADVANCE_PROPOSAL_COLLECTION_NAME)

const fields = (payload) => ({
  reportDate: payload.reportDate,
  fullName: payload.fullName,
  department: payload.department,
  content: payload.content,
  amount: payload.amount,
  amountWords: payload.amountWords,
  bankAccount: payload.bankAccount
})

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

const createAdvanceProposal = async (payload, createdBy) => {
  const created = await advanceProposalModel.createNew({
    ...fields(payload),
    createdBy: createdBy || '',
    status: 'draft'
  })
  return { id: created.insertedId.toString() }
}

const updateAdvanceProposal = async (id, payload) => {
  if (!OBJECT_ID_RULE.test(String(id))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Id phiếu không hợp lệ')
  }
  const result = await collection().updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...fields(payload), status: 'draft', updatedAt: new Date() } }
  )
  if (!result.matchedCount) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy bản nháp')
  return { id }
}

const deleteAdvanceProposal = async (id) => {
  if (!OBJECT_ID_RULE.test(String(id))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Id phiếu không hợp lệ')
  }
  const result = await collection().deleteOne({ _id: new ObjectId(id) })
  if (!result.deletedCount) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy bản nháp')
  return { id }
}

export const advanceProposalService = {
  listDrafts,
  getOne,
  createAdvanceProposal,
  updateAdvanceProposal,
  deleteAdvanceProposal
}
