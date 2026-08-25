import { quoteModel } from '~/models/quoteModel'
import { dealerModel } from '~/models/dealerModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { buildSearchFilter } from '~/utils/search.js'

const QUOTE_INCLUDE_FIELDS = {
  _id: 0,
  name: 1,
  description: 1,
  defaultMarginPercent: 1,
  dealerIds: 1,
  lines: 1,
  createdBy: 1,
  createdAt: 1,
  updatedAt: 1
}

const pickQuotePayload = (reqBody, userId) => ({
  name: reqBody.name,
  description: reqBody.description ?? '',
  defaultMarginPercent: Number(reqBody.defaultMarginPercent) || 0,
  dealerIds: Array.isArray(reqBody.dealerIds) ? reqBody.dealerIds : [],
  lines: Array.isArray(reqBody.lines) ? reqBody.lines : [],
  createdBy: userId
})

const ensureDealersExist = async (dealerIds) => {
  if (!dealerIds.length) return

  const checks = await Promise.all(dealerIds.map((id) => dealerModel.findOneById(id)))
  const missing = checks.findIndex((c) => !c)
  if (missing !== -1) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Không tìm thấy đại lý với id: ${dealerIds[missing]}`
    )
  }
}

const enrichDealers = async (quote) => {
  if (!quote || !quote.dealerIds?.length) {
    return { ...quote, dealers: [] }
  }

  const dealers = await Promise.all(quote.dealerIds.map((id) => dealerModel.findOneById(id)))
  return {
    ...quote,
    dealers: dealers
      .filter(Boolean)
      .map((d) => ({ _id: d._id.toString(), name: d.name, tier: d.tier }))
  }
}

const createNew = async (reqBody, userId) => {
  const payload = pickQuotePayload(reqBody, userId)
  await ensureDealersExist(payload.dealerIds)

  const created = await quoteModel.createNew(payload)
  const quote = await quoteModel.findOneById(created.insertedId)
  const formatted = formatDocument(quote)
  return await enrichDealers(formatted)
}

const getList = async (query) => {
  const findQuery = {}

  const searchFilter = buildSearchFilter(['name', 'description'], query.search)
  if (searchFilter) Object.assign(findQuery, searchFilter)

  const pagination = parsePaginationQuery(query)
  const result = await quoteModel.findMany(findQuery, {
    limit: pagination.limit,
    skip: pagination.skip
  })

  const items = formatDocuments(result.items)

  return buildPaginationResult(
    {
      items,
      total: result.total,
      limit: pagination.limit,
      skip: pagination.skip
    },
    pagination.page
  )
}

const getDetails = async (quoteId) => {
  const quote = await quoteModel.findOneById(quoteId)
  if (!quote) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy báo giá!')
  }
  const formatted = formatDocument(quote)
  return await enrichDealers(formatted)
}

const update = async (quoteId, updateData) => {
  const quote = await quoteModel.findOneById(quoteId)
  if (!quote) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy báo giá!')
  }

  if (updateData.dealerIds) {
    await ensureDealersExist(updateData.dealerIds)
  }

  const dataToUpdate = {}
  if (updateData.name !== undefined) dataToUpdate.name = updateData.name
  if (updateData.description !== undefined) dataToUpdate.description = updateData.description
  if (updateData.defaultMarginPercent !== undefined) {
    dataToUpdate.defaultMarginPercent = Number(updateData.defaultMarginPercent)
  }
  if (updateData.dealerIds !== undefined) dataToUpdate.dealerIds = updateData.dealerIds
  if (updateData.lines !== undefined) dataToUpdate.lines = updateData.lines

  await quoteModel.update(quoteId, dataToUpdate)
  return await getDetails(quoteId)
}

const deleteOne = async (quoteId) => {
  const quote = await quoteModel.findOneById(quoteId)
  if (!quote) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy báo giá!')
  }
  await quoteModel.deleteOne(quoteId)
  return { message: 'Đã xóa báo giá thành công!' }
}

export const quoteService = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne
}