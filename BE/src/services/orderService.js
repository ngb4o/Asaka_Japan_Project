import { orderModel } from '~/models/orderModel'
import { dealerModel } from '~/models/dealerModel'
import { productModel } from '~/models/productModel'
import { warehouseModel } from '~/models/warehouseModel'
import { inventoryService } from '~/services/inventoryService'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { generateDocumentCode } from '~/utils/documentCode'
import { UNIT_TYPE } from '~/utils/inventoryUnits'

const buildLineItems = async (items = []) => {
  if (!Array.isArray(items) || !items.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Order must have at least one item!')
  }

  const lineItems = []

  for (const item of items) {
    const product = await productModel.findOneById(item.productId)

    if (!product) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Product not found in order items!')
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

  return {
    items: lineItems,
    subtotal
  }
}

const enrichOrders = async (orders) => {
  const dealerIds = [
    ...new Set(
      orders.filter((item) => item.dealerId).map((item) => item.dealerId.toString())
    )
  ]
  const warehouseIds = [
    ...new Set(
      orders.filter((item) => item.warehouseId).map((item) => item.warehouseId.toString())
    )
  ]

  let dealerMap = new Map()
  let warehouseMap = new Map()

  if (dealerIds.length) {
    const dealers = await dealerModel.findMany(
      { _id: { $in: dealerIds.map((id) => new ObjectId(id)) } },
      { limit: dealerIds.length, skip: 0 }
    )
    dealerMap = new Map(dealers.items.map((item) => [item._id.toString(), item.name]))
  }

  if (warehouseIds.length) {
    const warehouses = await warehouseModel.findMany(
      { _id: { $in: warehouseIds.map((id) => new ObjectId(id)) } },
      { limit: warehouseIds.length, skip: 0 }
    )
    warehouseMap = new Map(warehouses.items.map((item) => [item._id.toString(), item.name]))
  }

  return orders.map((order) => {
    const formatted = formatDocument(order)
    return {
      ...formatted,
      dealerName: formatted.dealerId ? dealerMap.get(formatted.dealerId) || '' : '',
      warehouseName: formatted.warehouseId
        ? warehouseMap.get(formatted.warehouseId) || ''
        : ''
    }
  })
}

const exportInventoryForOrder = async (order, userId) => {
  if (!order.warehouseId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Warehouse is required before confirming order!'
    )
  }

  for (const item of order.items) {
    await inventoryService.exportStock(
      {
        warehouseId: order.warehouseId.toString(),
        productId: item.productId.toString(),
        quantity: item.quantity,
        unitType: UNIT_TYPE.BOTTLE,
        note: `Xuất kho cho đơn hàng ${order.code}`
      },
      userId
    )
  }
}

const createNew = async (reqBody, userId) => {
  const totals = await buildLineItems(reqBody.items)
  const code = await generateDocumentCode(orderModel.ORDER_COLLECTION_NAME, 'O')
  const discount = reqBody.discount ?? 0

  const created = await orderModel.createNew({
    code,
    dealerId: reqBody.dealerId || null,
    quoteId: reqBody.quoteId || null,
    warehouseId: reqBody.warehouseId || null,
    customerName: reqBody.customerName || '',
    customerPhone: reqBody.customerPhone || '',
    customerEmail: reqBody.customerEmail || '',
    items: totals.items,
    subtotal: totals.subtotal,
    discount,
    total: Math.max(0, totals.subtotal - discount),
    status: reqBody.status || orderModel.ORDER_STATUS.PENDING,
    note: reqBody.note || '',
    inventoryExported: false,
    createdBy: userId
  })

  const order = await orderModel.findOneById(created.insertedId)
  const [formatted] = await enrichOrders([order])
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
  const result = await orderModel.findMany(findQuery, {
    limit: pagination.limit,
    skip: pagination.skip
  })

  return buildPaginationResult(
    {
      items: await enrichOrders(result.items),
      total: result.total,
      limit: pagination.limit,
      skip: pagination.skip
    },
    pagination.page
  )
}

const getDetails = async (orderId) => {
  const order = await orderModel.findOneById(orderId)

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found!')
  }

  const [formatted] = await enrichOrders([order])
  return formatted
}

const update = async (orderId, updateData, userId) => {
  const order = await orderModel.findOneById(orderId)

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found!')
  }

  if (order.status === orderModel.ORDER_STATUS.CANCELLED) {
    throw new ApiError(StatusCodes.CONFLICT, 'Cannot update cancelled order!')
  }

  const dataToUpdate = {}
  const nextStatus = updateData.status ?? order.status
  const nextWarehouseId =
    updateData.warehouseId !== undefined
      ? updateData.warehouseId || null
      : order.warehouseId?.toString() || null

  if (updateData.dealerId !== undefined) dataToUpdate.dealerId = updateData.dealerId || null
  if (updateData.warehouseId !== undefined) {
    dataToUpdate.warehouseId = updateData.warehouseId || null
  }
  if (updateData.customerName !== undefined) dataToUpdate.customerName = updateData.customerName
  if (updateData.customerPhone !== undefined) {
    dataToUpdate.customerPhone = updateData.customerPhone
  }
  if (updateData.customerEmail !== undefined) {
    dataToUpdate.customerEmail = updateData.customerEmail
  }
  if (updateData.note !== undefined) dataToUpdate.note = updateData.note

  if (Array.isArray(updateData.items)) {
    if (order.inventoryExported) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'Cannot change items after inventory export!'
      )
    }

    const totals = await buildLineItems(updateData.items)
    dataToUpdate.items = totals.items
    dataToUpdate.subtotal = totals.subtotal
    dataToUpdate.discount = updateData.discount ?? order.discount ?? 0
    dataToUpdate.total = Math.max(0, totals.subtotal - dataToUpdate.discount)
  } else if (updateData.discount !== undefined) {
    if (order.inventoryExported) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'Cannot change discount after inventory export!'
      )
    }

    dataToUpdate.discount = updateData.discount
    dataToUpdate.total = Math.max(0, order.subtotal - updateData.discount)
  }

  if (updateData.status !== undefined) {
    dataToUpdate.status = updateData.status
  }

  const shouldExportInventory =
    !order.inventoryExported &&
    nextStatus === orderModel.ORDER_STATUS.CONFIRMED &&
    order.status !== orderModel.ORDER_STATUS.CONFIRMED

  if (shouldExportInventory) {
    const exportOrder = {
      ...order,
      warehouseId: nextWarehouseId ? new ObjectId(nextWarehouseId) : null,
      code: order.code
    }

    await exportInventoryForOrder(exportOrder, userId)
    dataToUpdate.inventoryExported = true
  }

  await orderModel.update(orderId, dataToUpdate)

  return await getDetails(orderId)
}

const deleteOne = async (orderId) => {
  const order = await orderModel.findOneById(orderId)

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found!')
  }

  if (order.inventoryExported) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'Cannot delete order after inventory export!'
    )
  }

  await orderModel.deleteOne(orderId)

  return { message: 'Order deleted successfully!' }
}

export const orderService = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne
}
