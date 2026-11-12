import { ObjectId } from 'mongodb'
import { StatusCodes } from 'http-status-codes'
import { GET_DB } from '~/config/mongodb'
import { utilityProposalModel } from '~/models/utilityProposalModel'
import ApiError from '~/utils/ApiError'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { OBJECT_ID_RULE } from '~/utils/validators'

const collection = () => GET_DB().collection(utilityProposalModel.UTILITY_PROPOSAL_COLLECTION_NAME)

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

const createUtilityProposal = async (payload, createdBy) => {
  const created = await utilityProposalModel.createNew({
    ...payload,
    createdBy: createdBy || '',
    status: 'draft'
  })
  return { id: created.insertedId.toString() }
}

const updateUtilityProposal = async (id, payload) => {
  if (!OBJECT_ID_RULE.test(String(id))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Id phiếu không hợp lệ')
  }
  const result = await collection().updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...payload,
        status: 'draft',
        updatedAt: new Date()
      }
    }
  )
  if (!result.matchedCount) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy bản nháp')
  return { id }
}

const deleteUtilityProposal = async (id) => {
  if (!OBJECT_ID_RULE.test(String(id))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Id phiếu không hợp lệ')
  }
  const result = await collection().deleteOne({ _id: new ObjectId(id) })
  if (!result.deletedCount) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy bản nháp')
  return { id }
}

export const utilityProposalService = {
  listDrafts,
  getOne,
  createUtilityProposal,
  updateUtilityProposal,
  deleteUtilityProposal
}
