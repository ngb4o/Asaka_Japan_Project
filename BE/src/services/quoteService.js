import { ObjectId } from 'mongodb'
import { quoteModel } from '~/models/quoteModel'
import { dealerModel } from '~/models/dealerModel'
import { productModel } from '~/models/productModel'
import { productCategoryModel } from '~/models/productCategoryModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { buildSearchFilter } from '~/utils/search.js'

const OBJECT_ID_HEX = /^[0-9a-fA-F]{24}$/

const toIdString = (value) => {
  if (!value) return ''
  return typeof value.toString === 'function' ? value.toString() : String(value)
}

const enrichQuoteLinesCategory = async (quote) => {
  if (!quote?.lines?.length) return quote

  const needsLookup = quote.lines.some(
    (line) => line?.productId && !(line.categoryName || '').trim()
  )
  if (!needsLookup) return quote

  const productIds = [
    ...new Set(
      quote.lines
        .filter((line) => line?.productId && !(line.categoryName || '').trim())
        .map((line) => toIdString(line.productId))
        .filter((id) => OBJECT_ID_HEX.test(id))
    )
  ]
  if (!productIds.length) return quote

  const { items: products } = await productModel.findMany(
    { _id: { $in: productIds.map((id) => new ObjectId(id)) } },
    { limit: productIds.length }
  )

  const categoryIds = [
    ...new Set(
      products
        .map((product) => toIdString(product.categoryId))
        .filter((id) => OBJECT_ID_HEX.test(id))
    )
  ]

  const categories = categoryIds.length
    ? (
        await productCategoryModel.findMany(
          { _id: { $in: categoryIds.map((id) => new ObjectId(id)) } },
          { limit: categoryIds.length }
        )
      ).items
    : []

  const productMap = new Map(
    products.map((product) => [toIdString(product._id || product.id), product])
  )
  const categoryMap = new Map(
    categories.map((category) => [toIdString(category._id || category.id), category])
  )

  return {
    ...quote,
    lines: quote.lines.map((line) => {
      if ((line.categoryName || '').trim()) return line
      const product = productMap.get(toIdString(line.productId))
      if (!product) return line

      const categoryId = toIdString(product.categoryId)
      const categoryName = categoryMap.get(categoryId)?.name || ''
      if (!categoryId && !categoryName) return line

      return {
        ...line,
        categoryId: line.categoryId || categoryId,
        categoryName
      }
    })
  }
}

const QUOTE_INCLUDE_FIELDS = {
  _id: 0,
  name: 1,
  description: 1,
  defaultMarginPercent: 1,
  dealerIds: 1,
  lines: 1,
  validFrom: 1,
  validUntil: 1,
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
  validFrom: reqBody.validFrom ? new Date(reqBody.validFrom) : null,
  validUntil: reqBody.validUntil ? new Date(reqBody.validUntil) : null,
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
  return await getDetails(created.insertedId.toString())
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
  const withCategory = await enrichQuoteLinesCategory(formatted)
  return await enrichDealers(withCategory)
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
  if (updateData.validFrom !== undefined) {
    dataToUpdate.validFrom = updateData.validFrom ? new Date(updateData.validFrom) : null
  }
  if (updateData.validUntil !== undefined) {
    dataToUpdate.validUntil = updateData.validUntil ? new Date(updateData.validUntil) : null
  }

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