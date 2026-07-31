import { orderModel } from '~/models/orderModel'
import { dealerModel } from '~/models/dealerModel'
import { productModel } from '~/models/productModel'
import { warehouseModel } from '~/models/warehouseModel'
import { warehouseStockModel } from '~/models/warehouseStockModel'
import { employeeModel } from '~/models/employeeModel'
import { inventoryService } from '~/services/inventoryService'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb'
import { formatDocument } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { generateDocumentCode } from '~/utils/documentCode'
import { toBaseQuantity, toUnitsPerCase, UNIT_TYPE } from '~/utils/inventoryUnits'
import { telegramNotifyService } from '~/services/telegram/telegramNotifyService'
import { buildSearchFilter } from '~/utils/search.js'

const resolveDeliveryEmployeeIds = (body = {}) => {
  const ids = new Set()
  if (Array.isArray(body.deliveryEmployeeIds)) {
    for (const id of body.deliveryEmployeeIds) {
      if (id) ids.add(String(id))
    }
  }
  if (body.deliveryEmployeeId) {
    ids.add(String(body.deliveryEmployeeId))
  }
  return [...ids]
}

const getOrderDeliveryEmployeeIds = (order) => {
  const ids = []
  if (Array.isArray(order.deliveryEmployeeIds)) {
    for (const id of order.deliveryEmployeeIds) {
      if (id) ids.push(id.toString())
    }
  }
  if (order.deliveryEmployeeId) {
    ids.push(order.deliveryEmployeeId.toString())
  }
  return [...new Set(ids)]
}

const parseOptionalDate = (value) => {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Ngày không hợp lệ!')
  }
  return date
}

const resolvePaymentStatus = (paidAmount, total, explicitStatus) => {
  const paid = Math.max(0, Number(paidAmount) || 0)
  const orderTotal = Math.max(0, Number(total) || 0)

  if (explicitStatus === orderModel.PAYMENT_STATUS.PAID && paid <= 0 && orderTotal > 0) {
    return { paymentStatus: orderModel.PAYMENT_STATUS.PAID, paidAmount: orderTotal }
  }

  if (paid <= 0) {
    return { paymentStatus: orderModel.PAYMENT_STATUS.UNPAID, paidAmount: 0 }
  }
  if (orderTotal > 0 && paid >= orderTotal) {
    return { paymentStatus: orderModel.PAYMENT_STATUS.PAID, paidAmount: orderTotal }
  }
  const partialPaid = orderTotal > 0 ? Math.min(paid, orderTotal) : paid
  return { paymentStatus: orderModel.PAYMENT_STATUS.PARTIAL, paidAmount: partialPaid }
}

const withPaymentDefaults = (order) => {
  const total = Number(order.total) || 0
  const paidAmount = Number(order.paidAmount) || 0
  const resolved = resolvePaymentStatus(paidAmount, total, order.paymentStatus)

  return {
    ...order,
    paymentStatus: order.paymentStatus || resolved.paymentStatus,
    paidAmount: order.paidAmount ?? resolved.paidAmount,
    remainingAmount: Math.max(0, total - (Number(order.paidAmount) || 0)),
    paymentNote: order.paymentNote || '',
    shippingAddress: order.shippingAddress || '',
    shippingContactName: order.shippingContactName || '',
    shippingPhone: order.shippingPhone || '',
    carrier: order.carrier || '',
    trackingCode: order.trackingCode || '',
    shippingDate: order.shippingDate || null,
    deliveredAt: order.deliveredAt || null,
    shippingFee: Number(order.shippingFee) || 0,
    shippingNote: order.shippingNote || ''
  }
}

const buildLineItems = async (items = []) => {
  if (!Array.isArray(items) || !items.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Đơn hàng phải có ít nhất một sản phẩm!')
  }

  const lineItems = []

  for (const item of items) {
    const product = await productModel.findOneById(item.productId)

    if (!product) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không tìm thấy sản phẩm trong đơn hàng!')
    }

    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 0))
    const unitType =
      item.unitType === UNIT_TYPE.CASE ? UNIT_TYPE.CASE : UNIT_TYPE.BOTTLE
    const unitsPerCase = toUnitsPerCase(product.unitsPerCase)

    if (unitType === UNIT_TYPE.CASE && unitsPerCase <= 1) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Sản phẩm "${product.name}" chưa cấu hình số chai/thùng — chỉ đặt theo chai!`
      )
    }

    let quantityBase
    try {
      quantityBase = toBaseQuantity(quantity, unitType, unitsPerCase)
    } catch {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Số lượng sản phẩm không hợp lệ!')
    }

    const unitPrice = Number.isFinite(Number(item.unitPrice))
      ? Number(item.unitPrice)
      : Number(product.price)
    const lineTotal = quantity * unitPrice

    lineItems.push({
      productId: product._id.toString(),
      productName: product.name,
      quantity,
      unitType,
      quantityBase,
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
  const tripIds = [
    ...new Set(
      orders.filter((item) => item.tripId).map((item) => item.tripId.toString())
    )
  ]
  const deliveryEmployeeIds = [
    ...new Set(
      orders.flatMap((item) => getOrderDeliveryEmployeeIds(item))
    )
  ]

  let dealerMap = new Map()
  let warehouseMap = new Map()
  let tripMap = new Map()
  let deliveryEmployeeMap = new Map()

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

  if (tripIds.length) {
    const { tripModel } = await import('~/models/tripModel')
    const trips = await tripModel.findMany(
      { _id: { $in: tripIds.map((id) => new ObjectId(id)) } },
      { limit: tripIds.length, skip: 0 }
    )
    tripMap = new Map(trips.items.map((item) => [item._id.toString(), item.code]))
  }

  if (deliveryEmployeeIds.length) {
    const employees = await employeeModel.findMany(
      { _id: { $in: deliveryEmployeeIds.map((id) => new ObjectId(id)) } },
      { limit: deliveryEmployeeIds.length, skip: 0 }
    )
    deliveryEmployeeMap = new Map(
      employees.items.map((item) => [item._id.toString(), item.fullName || ''])
    )
  }

  return orders.map((order) => {
    const formatted = withPaymentDefaults(formatDocument(order))
    const ids = getOrderDeliveryEmployeeIds(order)
    const names = ids
      .map((id) => deliveryEmployeeMap.get(id) || '')
      .filter(Boolean)
    return {
      ...formatted,
      deliveryEmployeeIds: ids,
      deliveryEmployeeId: ids[0] || null,
      tripId: order.tripId ? order.tripId.toString() : null,
      dealerName: formatted.dealerId ? dealerMap.get(formatted.dealerId) || '' : '',
      warehouseName: formatted.warehouseId
        ? warehouseMap.get(formatted.warehouseId) || ''
        : '',
      tripCode: order.tripId ? tripMap.get(order.tripId.toString()) || '' : '',
      deliveryEmployeeNames: names,
      deliveryEmployeeName: names.join(', ')
    }
  })
}

const lineItemBaseQuantity = (item) =>
  Math.max(1, Number(item.quantityBase ?? item.quantity) || 0)

const exportInventoryForOrder = async (order, userId) => {
  if (!order.warehouseId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Vui lòng chọn kho trước khi xác nhận đơn hàng!'
    )
  }

  const stockChecks = await Promise.all(
    order.items.map(async (item) => {
      const needed = lineItemBaseQuantity(item)
      const stock = await warehouseStockModel.findOneByWarehouseAndProduct(
        order.warehouseId.toString(),
        item.productId.toString()
      )
      return (stock?.quantity || 0) >= needed
    })
  )

  if (stockChecks.some((isEnough) => !isEnough)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Sản phẩm trong kho không đủ')
  }

  for (const item of order.items) {
    const quantityBase = lineItemBaseQuantity(item)
    try {
      await inventoryService.exportStock(
        {
          warehouseId: order.warehouseId.toString(),
          productId: item.productId.toString(),
          quantity: quantityBase,
          unitType: UNIT_TYPE.BOTTLE,
          note: `Xuất kho cho đơn hàng ${order.code}`
        },
        userId
      )
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === StatusCodes.BAD_REQUEST) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Sản phẩm trong kho không đủ')
      }
      throw error
    }
  }
}

const restoreInventoryForOrder = async (order, userId) => {
  if (!order.warehouseId || !order.items?.length) return

  for (const item of order.items) {
    const quantityBase = lineItemBaseQuantity(item)
    await inventoryService.importStock(
      {
        warehouseId: order.warehouseId.toString(),
        productId: item.productId.toString(),
        quantity: quantityBase,
        unitType: UNIT_TYPE.BOTTLE,
        note: `Hoàn tồn do hủy đơn hàng ${order.code}`
      },
      userId
    )
  }
}

const applyShippingFields = (dataToUpdate, updateData) => {
  const textFields = [
    'shippingAddress',
    'shippingContactName',
    'shippingPhone',
    'carrier',
    'trackingCode',
    'shippingNote'
  ]

  for (const field of textFields) {
    if (updateData[field] !== undefined) {
      dataToUpdate[field] = updateData[field] || ''
    }
  }

  if (updateData.shippingFee !== undefined) {
    dataToUpdate.shippingFee = Math.max(0, Number(updateData.shippingFee) || 0)
  }

  if (updateData.shippingDate !== undefined) {
    dataToUpdate.shippingDate = parseOptionalDate(updateData.shippingDate)
  }

  if (updateData.deliveredAt !== undefined) {
    dataToUpdate.deliveredAt = parseOptionalDate(updateData.deliveredAt)
  }

  if (updateData.deliveryEmployeeIds !== undefined || updateData.deliveryEmployeeId !== undefined) {
    dataToUpdate.deliveryEmployeeIds = resolveDeliveryEmployeeIds(updateData)
    dataToUpdate.deliveryEmployeeId = null
  }
}

const createNew = async (reqBody, userId) => {
  if (
    reqBody.status !== undefined &&
    reqBody.status !== orderModel.ORDER_STATUS.PENDING
  ) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'Hãy tạo đơn ở trạng thái Chờ xử lý, sau đó xác nhận để xuất kho!'
    )
  }

  const totals = await buildLineItems(reqBody.items)
  const code = await generateDocumentCode(orderModel.ORDER_COLLECTION_NAME, 'O')
  const discount = reqBody.discount ?? 0
  const total = Math.max(0, totals.subtotal - discount)
  const payment = resolvePaymentStatus(
    reqBody.paidAmount ?? 0,
    total,
    reqBody.paymentStatus
  )

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
    total,
    status: reqBody.status || orderModel.ORDER_STATUS.PENDING,
    note: reqBody.note || '',
    inventoryExported: false,
    paymentStatus: payment.paymentStatus,
    paidAmount: payment.paidAmount,
    paymentNote: reqBody.paymentNote || '',
    shippingAddress: reqBody.shippingAddress || '',
    shippingContactName: reqBody.shippingContactName || '',
    shippingPhone: reqBody.shippingPhone || '',
    carrier: reqBody.carrier || '',
    deliveryEmployeeIds: resolveDeliveryEmployeeIds(reqBody),
    trackingCode: reqBody.trackingCode || '',
    shippingDate: parseOptionalDate(reqBody.shippingDate) ?? null,
    deliveredAt: parseOptionalDate(reqBody.deliveredAt) ?? null,
    shippingFee: Math.max(0, Number(reqBody.shippingFee) || 0),
    shippingNote: reqBody.shippingNote || '',
    createdBy: userId
  })

  const order = await orderModel.findOneById(created.insertedId)
  const [formatted] = await enrichOrders([order])
  telegramNotifyService.onOrderCreated(formatted)
  return formatted
}

const getList = async (query) => {
  const findQuery = {}

  if (query.status) findQuery.status = query.status

  const hasDebt =
    query.hasDebt === 'true' || query.hasDebt === '1' || query.hasDebt === true
  if (hasDebt) {
    findQuery.paymentStatus = {
      $in: [orderModel.PAYMENT_STATUS.UNPAID, orderModel.PAYMENT_STATUS.PARTIAL]
    }
    // Còn nợ: bỏ đơn đã hủy trừ khi đang lọc trạng thái cụ thể
    if (!query.status) {
      findQuery.status = { $ne: orderModel.ORDER_STATUS.CANCELLED }
    }
  } else if (query.paymentStatus) {
    findQuery.paymentStatus = query.paymentStatus
  }

  if (query.dealerId) findQuery.dealerId = new ObjectId(query.dealerId)

  if (query.withoutTrip === 'true' || query.withoutTrip === '1') {
    findQuery.tripId = null
  }

  if (query.deliveryEmployeeIds) {
    const ids = String(query.deliveryEmployeeIds)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((id) => new ObjectId(id))

    // match=all: đơn phải gắn đủ mọi NV đã chọn (dùng khi tạo chuyến)
    // match=any (mặc định): đơn gắn ít nhất 1 NV
    const matchAll =
      query.deliveryEmployeeMatch === 'all' ||
      query.deliveryEmployeeMatch === '1' ||
      query.deliveryEmployeeMatch === 'true'

    if (ids.length) {
      findQuery.$and = findQuery.$and || []
      if (matchAll) {
        for (const id of ids) {
          findQuery.$and.push({
            $or: [{ deliveryEmployeeIds: id }, { deliveryEmployeeId: id }]
          })
        }
      } else {
        findQuery.$and.push({
          $or: [
            { deliveryEmployeeIds: { $in: ids } },
            { deliveryEmployeeId: { $in: ids } }
          ]
        })
      }
    }
  }

  const searchFilter = buildSearchFilter(
    ['code', 'customerName', 'customerPhone', 'trackingCode'],
    query.search
  )
  if (searchFilter) Object.assign(findQuery, searchFilter)

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
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng!')
  }

  const [formatted] = await enrichOrders([order])
  return formatted
}

const ALLOWED_STATUS_TRANSITIONS = {
  [orderModel.ORDER_STATUS.PENDING]: [
    orderModel.ORDER_STATUS.PENDING,
    orderModel.ORDER_STATUS.CONFIRMED,
    orderModel.ORDER_STATUS.CANCELLED
  ],
  [orderModel.ORDER_STATUS.CONFIRMED]: [
    orderModel.ORDER_STATUS.CONFIRMED,
    orderModel.ORDER_STATUS.DELIVERING,
    orderModel.ORDER_STATUS.COMPLETED,
    orderModel.ORDER_STATUS.CANCELLED
  ],
  [orderModel.ORDER_STATUS.DELIVERING]: [
    orderModel.ORDER_STATUS.DELIVERING,
    orderModel.ORDER_STATUS.COMPLETED,
    orderModel.ORDER_STATUS.CANCELLED
  ],
  [orderModel.ORDER_STATUS.COMPLETED]: [orderModel.ORDER_STATUS.COMPLETED],
  [orderModel.ORDER_STATUS.CANCELLED]: [orderModel.ORDER_STATUS.CANCELLED]
}

const assertStatusTransition = (currentStatus, nextStatus) => {
  if (!nextStatus || nextStatus === currentStatus) return
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || []
  if (!allowed.includes(nextStatus)) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      `Không thể chuyển trạng thái từ "${currentStatus}" sang "${nextStatus}"!`
    )
  }
}

const update = async (orderId, updateData, userId, options = {}) => {
  const order = await orderModel.findOneById(orderId)

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng!')
  }

  if (order.status === orderModel.ORDER_STATUS.CANCELLED) {
    throw new ApiError(StatusCodes.CONFLICT, 'Không thể cập nhật đơn hàng đã hủy!')
  }

  const dataToUpdate = {}
  const nextStatus = updateData.status ?? order.status
  assertStatusTransition(order.status, nextStatus)

  const nextWarehouseId =
    updateData.warehouseId !== undefined
      ? updateData.warehouseId || null
      : order.warehouseId?.toString() || null

  if (
    order.status === orderModel.ORDER_STATUS.PENDING &&
    ![
      orderModel.ORDER_STATUS.PENDING,
      orderModel.ORDER_STATUS.CONFIRMED,
      orderModel.ORDER_STATUS.CANCELLED
    ].includes(nextStatus)
  ) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'Đơn hàng phải được xác nhận và xuất kho trước khi chuyển trạng thái tiếp theo!'
    )
  }

  if (
    order.status !== orderModel.ORDER_STATUS.PENDING &&
    nextStatus === orderModel.ORDER_STATUS.PENDING
  ) {
    throw new ApiError(StatusCodes.CONFLICT, 'Không thể chuyển đơn hàng về Chờ xử lý!')
  }

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

  applyShippingFields(dataToUpdate, updateData)

  let nextTotal = order.total

  if (Array.isArray(updateData.items)) {
    if (order.inventoryExported) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'Không thể sửa sản phẩm sau khi đã xuất kho!'
      )
    }

    const totals = await buildLineItems(updateData.items)
    dataToUpdate.items = totals.items
    dataToUpdate.subtotal = totals.subtotal
    dataToUpdate.discount = updateData.discount ?? order.discount ?? 0
    dataToUpdate.total = Math.max(0, totals.subtotal - dataToUpdate.discount)
    nextTotal = dataToUpdate.total
  } else if (updateData.discount !== undefined) {
    if (order.inventoryExported) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'Không thể sửa chiết khấu sau khi đã xuất kho!'
      )
    }

    dataToUpdate.discount = updateData.discount
    dataToUpdate.total = Math.max(0, order.subtotal - updateData.discount)
    nextTotal = dataToUpdate.total
  }

  if (
    updateData.paidAmount !== undefined ||
    updateData.paymentStatus !== undefined ||
    updateData.paymentNote !== undefined ||
    dataToUpdate.total !== undefined
  ) {
    const payment = resolvePaymentStatus(
      updateData.paidAmount !== undefined ? updateData.paidAmount : order.paidAmount,
      nextTotal,
      updateData.paymentStatus !== undefined
        ? updateData.paymentStatus
        : order.paymentStatus
    )
    dataToUpdate.paymentStatus = payment.paymentStatus
    dataToUpdate.paidAmount = payment.paidAmount
    if (updateData.paymentNote !== undefined) {
      dataToUpdate.paymentNote = updateData.paymentNote || ''
    }
  }

  if (updateData.status !== undefined) {
    dataToUpdate.status = updateData.status

    if (
      updateData.status === orderModel.ORDER_STATUS.DELIVERING &&
      updateData.shippingDate === undefined &&
      !order.shippingDate
    ) {
      dataToUpdate.shippingDate = new Date()
    }

    if (
      updateData.status === orderModel.ORDER_STATUS.COMPLETED &&
      updateData.deliveredAt === undefined &&
      !order.deliveredAt
    ) {
      dataToUpdate.deliveredAt = new Date()
    }
  }

  const shouldRestoreInventory =
    nextStatus === orderModel.ORDER_STATUS.CANCELLED && order.inventoryExported

  if (shouldRestoreInventory) {
    await restoreInventoryForOrder(order, userId)
    dataToUpdate.inventoryExported = false
  }

  const shouldExportInventory =
    !order.inventoryExported &&
    !shouldRestoreInventory &&
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

  const formatted = await getDetails(orderId)

  // Telegram inline actions already edit the tracked message — skip broadcasting a duplicate.
  if (!options.silentTelegram) {
    telegramNotifyService.onOrderStatusChanged(order.status, formatted)

    if (
      dataToUpdate.paymentStatus !== undefined &&
      dataToUpdate.paymentStatus !== order.paymentStatus
    ) {
      telegramNotifyService.onPaymentUpdated(formatted)
    }
  }

  return formatted
}

const recordPayment = async (orderId, { amount, note }, options = {}) => {
  const order = await orderModel.findOneById(orderId)

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng!')
  }

  if (order.status === orderModel.ORDER_STATUS.CANCELLED) {
    throw new ApiError(StatusCodes.CONFLICT, 'Không thể ghi nhận thanh toán cho đơn đã hủy!')
  }

  const nextPaid = Math.max(0, Number(order.paidAmount) || 0) + Math.max(0, Number(amount) || 0)
  const payment = resolvePaymentStatus(nextPaid, order.total)

  await orderModel.update(orderId, {
    paidAmount: payment.paidAmount,
    paymentStatus: payment.paymentStatus,
    paymentNote: note !== undefined ? note || '' : order.paymentNote || ''
  })

  const formatted = await getDetails(orderId)
  if (!options.silentTelegram) {
    telegramNotifyService.onPaymentUpdated(formatted)
  }
  return formatted
}

const deleteOne = async (orderId) => {
  const order = await orderModel.findOneById(orderId)

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng!')
  }

  if (order.inventoryExported) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'Không thể xóa đơn hàng sau khi đã xuất kho!'
    )
  }

  await orderModel.deleteOne(orderId)

  return { message: 'Đã xóa đơn hàng thành công!' }
}

export const orderService = {
  createNew,
  getList,
  getDetails,
  update,
  recordPayment,
  deleteOne
}
