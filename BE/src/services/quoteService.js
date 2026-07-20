import { quoteModel } from '~/models/quoteModel'
import { orderModel } from '~/models/orderModel'
import { dealerModel } from '~/models/dealerModel'
import { productModel } from '~/models/productModel'
import { orderService } from '~/services/orderService'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { generateDocumentCode } from '~/utils/documentCode'

const buildLineItems = async (items = []) => {
  if (!Array.isArray(items) || !items.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Quote must have at least one item!')
  }

  const lineItems = []

  for (const item of items) {
    const product = await productModel.findOneById(item.productId)

    if (!product) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Product not found in quote items!')
    }

    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 0))
    const unitPrice = Number.isFinite(Number(item.unitPrice))
      ? Number(item.unitPrice)
      : Number(product.price)
    const lineTotal = quantity * unitPrice

    lineItems.push({
      productId: product._id.toString(),
      productName: product.name,
      quantity,
      unitPrice,
      lineTotal
    })
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0)
  const discount = 0

  return {
    items: lineItems,
    subtotal,
    discount,
    total: Math.max(0, subtotal - discount)
  }
}

const enrichQuotes = async (quotes) => {
  const dealerIds = [
    ...new Set(
      quotes.filter((item) => item.dealerId).map((item) => item.dealerId.toString())
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

  return quotes.map((quote) => {
    const formatted = formatDocument(quote)
    return {
      ...formatted,
      dealerName: formatted.dealerId ? dealerMap.get(formatted.dealerId) || '' : ''
    }
  })
}

const createNew = async (reqBody, userId) => {
  const totals = await buildLineItems(reqBody.items)
  const code = await generateDocumentCode(quoteModel.QUOTE_COLLECTION_NAME, 'Q')

  const created = await quoteModel.createNew({
    code,
    dealerId: reqBody.dealerId || null,
    customerName: reqBody.customerName || '',
    customerPhone: reqBody.customerPhone || '',
    customerEmail: reqBody.customerEmail || '',
    items: totals.items,
    subtotal: totals.subtotal,
    discount: reqBody.discount ?? totals.discount,
    total: Math.max(0, totals.subtotal - (reqBody.discount ?? totals.discount)),
    status: reqBody.status || quoteModel.QUOTE_STATUS.DRAFT,
    note: reqBody.note || '',
    validUntil: reqBody.validUntil ? new Date(reqBody.validUntil) : null,
    orderId: null,
    createdBy: userId
  })

  const quote = await quoteModel.findOneById(created.insertedId)
  const [formatted] = await enrichQuotes([quote])
  return formatted
}

const getList = async (query) => {
  const findQuery = {}

  if (query.status) findQuery.status = query.status
  if (query.dealerId) findQuery.dealerId = new ObjectId(query.dealerId)

  if (query.search) {
    findQuery.$or = [
      { code: { $regex: query.search, $options: 'i' } },
      { customerName: { $regex: query.search, $options: 'i' } },
      { customerPhone: { $regex: query.search, $options: 'i' } }
    ]
  }

  const pagination = parsePaginationQuery(query)
  const result = await quoteModel.findMany(findQuery, {
    limit: pagination.limit,
    skip: pagination.skip
  })

  return buildPaginationResult(
    {
      items: await enrichQuotes(result.items),
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
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quote not found!')
  }

  const [formatted] = await enrichQuotes([quote])
  return formatted
}

const update = async (quoteId, updateData) => {
  const quote = await quoteModel.findOneById(quoteId)

  if (!quote) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quote not found!')
  }

  if (quote.orderId) {
    throw new ApiError(StatusCodes.CONFLICT, 'Cannot update quote that was converted to order!')
  }

  const dataToUpdate = {}

  if (updateData.dealerId !== undefined) dataToUpdate.dealerId = updateData.dealerId || null
  if (updateData.customerName !== undefined) dataToUpdate.customerName = updateData.customerName
  if (updateData.customerPhone !== undefined) {
    dataToUpdate.customerPhone = updateData.customerPhone
  }
  if (updateData.customerEmail !== undefined) {
    dataToUpdate.customerEmail = updateData.customerEmail
  }
  if (updateData.status !== undefined) dataToUpdate.status = updateData.status
  if (updateData.note !== undefined) dataToUpdate.note = updateData.note
  if (updateData.validUntil !== undefined) {
    dataToUpdate.validUntil = updateData.validUntil ? new Date(updateData.validUntil) : null
  }

  if (Array.isArray(updateData.items)) {
    const totals = await buildLineItems(updateData.items)
    dataToUpdate.items = totals.items
    dataToUpdate.subtotal = totals.subtotal
    dataToUpdate.discount = updateData.discount ?? quote.discount ?? 0
    dataToUpdate.total = Math.max(0, totals.subtotal - dataToUpdate.discount)
  } else if (updateData.discount !== undefined) {
    dataToUpdate.discount = updateData.discount
    dataToUpdate.total = Math.max(0, quote.subtotal - updateData.discount)
  }

  await quoteModel.update(quoteId, dataToUpdate)

  return await getDetails(quoteId)
}

const deleteOne = async (quoteId) => {
  const quote = await quoteModel.findOneById(quoteId)

  if (!quote) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quote not found!')
  }

  if (quote.orderId) {
    throw new ApiError(StatusCodes.CONFLICT, 'Cannot delete quote linked to an order!')
  }

  await quoteModel.deleteOne(quoteId)

  return { message: 'Quote deleted successfully!' }
}

const convertToOrder = async (quoteId, reqBody, userId) => {
  const quote = await quoteModel.findOneById(quoteId)

  if (!quote) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quote not found!')
  }

  if (quote.orderId) {
    throw new ApiError(StatusCodes.CONFLICT, 'Quote already converted to order!')
  }

  const order = await orderService.createNew(
    {
      dealerId: quote.dealerId?.toString() || null,
      quoteId: quoteId,
      warehouseId: reqBody.warehouseId || null,
      customerName: quote.customerName || '',
      customerPhone: quote.customerPhone || '',
      customerEmail: quote.customerEmail || '',
      items: quote.items.map((item) => ({
        productId: item.productId.toString(),
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal
      })),
      discount: quote.discount,
      note: reqBody.note || quote.note || '',
      status: orderModel.ORDER_STATUS.PENDING
    },
    userId
  )

  await quoteModel.update(quoteId, {
    status: quoteModel.QUOTE_STATUS.ACCEPTED,
    orderId: order.id
  })

  return order
}

export const quoteService = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne,
  convertToOrder
}
