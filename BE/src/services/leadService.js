import { leadModel } from '~/models/leadModel'
import { dealerModel } from '~/models/dealerModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'

const formatLead = (lead, dealerMap = new Map()) => {
  const formatted = formatDocument(lead)
  if (!formatted) return null

  return {
    ...formatted,
    dealerName: formatted.dealerId ? dealerMap.get(formatted.dealerId) || '' : ''
  }
}

const createPublic = async (reqBody) => {
  const created = await leadModel.createNew({
    name: reqBody.name,
    phone: reqBody.phone,
    email: reqBody.email || '',
    company: reqBody.company || '',
    region: reqBody.region || '',
    message: reqBody.message || '',
    type: reqBody.type || leadModel.LEAD_TYPE.CONTACT,
    source: reqBody.source || 'website',
    status: leadModel.LEAD_STATUS.NEW,
    note: '',
    dealerId: null
  })

  const lead = await leadModel.findOneById(created.insertedId)
  return formatLead(lead)
}

const getList = async (query) => {
  const findQuery = {}

  if (query.status) findQuery.status = query.status
  if (query.type) findQuery.type = query.type

  if (query.search) {
    findQuery.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { phone: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
      { company: { $regex: query.search, $options: 'i' } }
    ]
  }

  const pagination = parsePaginationQuery(query)
  const result = await leadModel.findMany(findQuery, {
    limit: pagination.limit,
    skip: pagination.skip
  })

  const dealerIds = [
    ...new Set(
      result.items
        .filter((item) => item.dealerId)
        .map((item) => item.dealerId.toString())
    )
  ]

  let dealerMap = new Map()

  if (dealerIds.length) {
    const dealers = await dealerModel.findMany(
      { _id: { $in: dealerIds.map((id) => new ObjectId(id)) } },
      { limit: dealerIds.length, skip: 0 }
    )
    dealerMap = new Map(dealers.items.map((item) => [item._id.toString(), item.name]))
  }

  return buildPaginationResult(
    {
      items: result.items.map((item) => formatLead(item, dealerMap)),
      total: result.total,
      limit: pagination.limit,
      skip: pagination.skip
    },
    pagination.page
  )
}

const getDetails = async (leadId) => {
  const lead = await leadModel.findOneById(leadId)

  if (!lead) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Lead not found!')
  }

  let dealerMap = new Map()

  if (lead.dealerId) {
    const dealer = await dealerModel.findOneById(lead.dealerId.toString())
    if (dealer) {
      dealerMap = new Map([[dealer._id.toString(), dealer.name]])
    }
  }

  return formatLead(lead, dealerMap)
}

const update = async (leadId, updateData) => {
  const lead = await leadModel.findOneById(leadId)

  if (!lead) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Lead not found!')
  }

  const dataToUpdate = {}

  if (updateData.status !== undefined) dataToUpdate.status = updateData.status
  if (updateData.note !== undefined) dataToUpdate.note = updateData.note
  if (updateData.dealerId !== undefined) dataToUpdate.dealerId = updateData.dealerId || null

  await leadModel.update(leadId, dataToUpdate)

  return await getDetails(leadId)
}

const deleteOne = async (leadId) => {
  const lead = await leadModel.findOneById(leadId)

  if (!lead) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Lead not found!')
  }

  await leadModel.deleteOne(leadId)

  return { message: 'Lead deleted successfully!' }
}

const convertToDealer = async (leadId, userId) => {
  const lead = await leadModel.findOneById(leadId)

  if (!lead) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Lead not found!')
  }

  if (lead.dealerId) {
    throw new ApiError(StatusCodes.CONFLICT, 'Lead already converted to dealer!')
  }

  const created = await dealerModel.createNew({
    name: lead.company || lead.name,
    contactName: lead.name,
    phone: lead.phone,
    email: lead.email || '',
    address: '',
    region: lead.region || '',
    tier: dealerModel.DEALER_TIER.STANDARD,
    discountPercent: 0,
    status: dealerModel.DEALER_STATUS.PENDING,
    note: lead.message || '',
    leadId: leadId,
    createdBy: userId
  })

  await leadModel.update(leadId, {
    status: leadModel.LEAD_STATUS.CONVERTED,
    dealerId: created.insertedId.toString()
  })

  const dealer = await dealerModel.findOneById(created.insertedId)
  return formatDocument(dealer)
}

export const leadService = {
  createPublic,
  getList,
  getDetails,
  update,
  deleteOne,
  convertToDealer
}
