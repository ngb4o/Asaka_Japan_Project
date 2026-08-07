import { ObjectId } from 'mongodb'
import { tripModel } from '~/models/tripModel'
import { employeeModel } from '~/models/employeeModel'
import { orderModel } from '~/models/orderModel'
import { dealerModel } from '~/models/dealerModel'
import { warehouseModel } from '~/models/warehouseModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { formatDocument } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { generateDocumentCode } from '~/utils/documentCode'
import { staffNotifyService } from '~/services/staffNotifyService'
import { buildSearchFilter } from '~/utils/search.js'
import { hasAnyRole } from '~/utils/roles'
import { hasValidLatLng } from '~/utils/geo'
import { geocodeAddress } from '~/utils/geocode'

const newId = () => new ObjectId().toString()

const MAX_RECEIPT_IMAGES = 5

/** Chuẩn hoá chứng từ: ưu tiên receiptUrls[], fallback receiptUrl (legacy). */
const normalizeReceiptUrls = (body = {}) => {
  const fromArray = Array.isArray(body.receiptUrls)
    ? body.receiptUrls.map((url) => String(url || '').trim()).filter(Boolean)
    : []
  if (fromArray.length) return fromArray.slice(0, MAX_RECEIPT_IMAGES)

  const single = String(body.receiptUrl || '').trim()
  return single ? [single] : []
}

const formatReceiptFields = (item = {}) => {
  const urls = normalizeReceiptUrls(item)
  return {
    receiptUrls: urls,
    receiptUrl: urls[0] || ''
  }
}

/** GPS check-in — lat/lng hợp lệ mới lưu. */
const normalizeGeoLocation = (body = {}) => {
  const latRaw = body.lat ?? body.geo?.lat
  const lngRaw = body.lng ?? body.geo?.lng
  if (latRaw === undefined || latRaw === null || latRaw === '') return null
  if (lngRaw === undefined || lngRaw === null || lngRaw === '') return null

  const lat = Number(latRaw)
  const lng = Number(lngRaw)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  const accuracyRaw = body.accuracy ?? body.geo?.accuracy
  const accuracy =
    accuracyRaw === undefined || accuracyRaw === null || accuracyRaw === ''
      ? null
      : Number(accuracyRaw)

  return {
    lat,
    lng,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    locationCapturedAt:
      parseDate(
        body.locationCapturedAt || body.geo?.capturedAt || body.capturedAt,
        'Thời điểm lấy vị trí'
      ) || new Date(),
    locationSource:
      body.locationSource || body.geo?.source || body.source || 'gps'
  }
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

/**
 * Mọi NV giao trên đơn gắn chuyến phải nằm trong Người đi.
 * Người đi có thể nhiều hơn NV giao (tài xế phụ, theo xe…).
 */
const assertOrdersCoveredByMembers = async (memberIds, orderIds) => {
  if (!Array.isArray(orderIds) || !orderIds.length) return

  const memberSet = new Set((memberIds || []).map((id) => String(id)))
  const conflicts = []

  for (const orderId of orderIds) {
    const order = await orderModel.findOneById(orderId)
    if (!order) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Đơn hàng không hợp lệ!')
    }
    const deliveryIds = getOrderDeliveryEmployeeIds(order)
    const missing = deliveryIds.filter((id) => !memberSet.has(id))
    if (missing.length) {
      conflicts.push({ code: order.code, missing })
    }
  }

  if (!conflicts.length) return

  const missingIds = [...new Set(conflicts.flatMap((item) => item.missing))]
  const employees = missingIds.length
    ? await employeeModel.findMany(
      { _id: { $in: missingIds.map((id) => new ObjectId(id)) } },
      { limit: missingIds.length, skip: 0 }
    )
    : { items: [] }
  const nameMap = new Map(
    employees.items.map((item) => [item._id.toString(), item.fullName || item.code || ''])
  )
  const orderCodes = conflicts.map((item) => item.code).join(', ')
  const names = missingIds
    .map((id) => nameMap.get(id) || id)
    .join(', ')
  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    `NV giao của đơn ${orderCodes} phải nằm trong Người đi. Thiếu: ${names}`
  )
}

/**
 * Từ đơn gắn chuyến → điểm dừng giao (thứ tự = thứ tự orderIds).
 * GPS: đại lý đã có → dùng luôn; chưa có → geocode địa chỉ giao / địa chỉ ĐL.
 */
const buildDeliveryStopsFromOrders = async (orderIds = [], startDate) => {
  const stops = []
  for (const orderId of orderIds) {
    const order = await orderModel.findOneById(orderId)
    if (!order) continue

    let dealer = null
    if (order.dealerId) {
      dealer = await dealerModel.findOneById(order.dealerId.toString())
    }

    const shippingAddress = String(order.shippingAddress || '').trim()
    const dealerAddress = String(dealer?.address || '').trim()
    const location = shippingAddress || dealerAddress || ''

    const stop = {
      id: newId(),
      date: startDate,
      dealerId: order.dealerId || null,
      orderId: order._id,
      location,
      purpose: tripModel.STOP_PURPOSE.DELIVERY,
      note: `Giao ${order.code}`
    }

    if (hasValidLatLng(dealer)) {
      stop.lat = dealer.lat
      stop.lng = dealer.lng
      stop.accuracy = null
      stop.locationCapturedAt = new Date()
      stop.locationSource = 'dealer'
    } else {
      const addressForGeo = shippingAddress || dealerAddress
      const coords = addressForGeo ? await geocodeAddress(addressForGeo) : null
      if (coords) {
        stop.lat = coords.lat
        stop.lng = coords.lng
        stop.accuracy = null
        stop.locationCapturedAt = new Date()
        stop.locationSource = 'geocode'

        // Lưu GPS vào đại lý khi geocode từ địa chỉ ĐL (lần sau khỏi geocode lại)
        if (
          dealer &&
          dealerAddress &&
          addressForGeo === dealerAddress &&
          !hasValidLatLng(dealer)
        ) {
          await dealerModel.update(dealer._id.toString(), {
            lat: coords.lat,
            lng: coords.lng
          })
        }
      }
    }

    stops.push(stop)
  }
  return stops
}

const resolveOriginWarehouse = async (warehouseDocs = [], orderWarehouseIds = []) => {
  if (!warehouseDocs.length) return null

  const counts = new Map()
  for (const id of orderWarehouseIds) {
    counts.set(id, (counts.get(id) || 0) + 1)
  }

  const rankedIds = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)

  const byId = new Map(
    warehouseDocs.map((item) => [item._id.toString(), item])
  )

  const candidates = [
    ...rankedIds.map((id) => byId.get(id)).filter(Boolean),
    ...warehouseDocs
  ]
  const seen = new Set()

  for (const warehouse of candidates) {
    const id = warehouse._id.toString()
    if (seen.has(id)) continue
    seen.add(id)

    if (hasValidLatLng(warehouse)) {
      return {
        id,
        name: warehouse.name || '',
        address: warehouse.address || '',
        lat: warehouse.lat,
        lng: warehouse.lng
      }
    }

    const address = String(warehouse.address || '').trim()
    if (!address) continue

    const coords = await geocodeAddress(address)
    if (!coords) continue

    await warehouseModel.update(id, {
      lat: coords.lat,
      lng: coords.lng
    })

    return {
      id,
      name: warehouse.name || '',
      address,
      lat: coords.lat,
      lng: coords.lng
    }
  }

  return null
}

const parseDate = (value, label = 'Ngày') => {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `${label} không hợp lệ!`)
  }
  return date
}

const assertEditable = (trip) => {
  if (trip.status === tripModel.TRIP_STATUS.CLOSED) {
    throw new ApiError(StatusCodes.CONFLICT, 'Chuyến đã khóa, không thể chỉnh sửa!')
  }
  if (trip.status === tripModel.TRIP_STATUS.CANCELLED) {
    throw new ApiError(StatusCodes.CONFLICT, 'Chuyến đã hủy!')
  }
}

/**
 * Admin/accountant can operate any trip.
 * Sales/warehouse only if they created it or are a trip member (via linked employee).
 */
const assertCanOperateTrip = async (trip, actorUserId, actorRoles) => {
  if (!actorUserId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Chưa xác thực!')
  }

  if (hasAnyRole(actorRoles, 'admin', 'accountant')) {
    return
  }

  const createdBy = trip.createdBy?.toString?.() || trip.createdBy || ''
  if (createdBy === String(actorUserId)) {
    return
  }

  const memberIds = (trip.memberIds || []).map((id) => id.toString())
  if (!memberIds.length) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Bạn không có quyền chỉnh sửa chuyến này!'
    )
  }

  const linked = await employeeModel.findMany(
    {
      _id: { $in: memberIds.map((id) => new ObjectId(id)) },
      userId: new ObjectId(actorUserId)
    },
    { limit: 1, skip: 0 }
  )

  if (!linked.items.length) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Chỉ người đi chuyến hoặc người tạo chuyến mới được chỉnh sửa!'
    )
  }
}

const calcSettlementPreview = (trip) => {
  const advanceTotal = (trip.advances || []).reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  )
  const approved = (trip.expenses || []).filter(
    (item) => item.status === tripModel.EXPENSE_STATUS.APPROVED
  )
  const expenseAdvanceTotal = approved
    .filter((item) => item.funding === tripModel.EXPENSE_FUNDING.ADVANCE)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const reimburseExpenses = approved.filter(
    (item) => item.funding === tripModel.EXPENSE_FUNDING.REIMBURSE
  )
  const expenseReimburseTotal = reimburseExpenses.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  )

  const employeeReturn = Math.max(0, advanceTotal - expenseAdvanceTotal)
  const advanceTopUp = Math.max(0, expenseAdvanceTotal - advanceTotal)
  const companyPay = expenseReimburseTotal + advanceTopUp

  // Hoàn chi "tự bỏ" → đúng NV đã trả; phần bù quỹ ứng chia đều người đi
  const payByEmployee = new Map()
  const memberIds = (trip.memberIds || []).map((id) => id.toString())
  for (const expense of reimburseExpenses) {
    const paidBy =
      expense.paidByEmployeeId?.toString?.() ||
      expense.paidByEmployeeId ||
      null
    if (paidBy) {
      payByEmployee.set(paidBy, (payByEmployee.get(paidBy) || 0) + (Number(expense.amount) || 0))
    } else if (memberIds.length) {
      // Chi cũ chưa gắn NV: chia đều (tương thích ngược)
      const share = (Number(expense.amount) || 0) / memberIds.length
      for (const memberId of memberIds) {
        payByEmployee.set(memberId, (payByEmployee.get(memberId) || 0) + share)
      }
    }
  }
  if (advanceTopUp > 0 && memberIds.length) {
    const share = advanceTopUp / memberIds.length
    for (const memberId of memberIds) {
      payByEmployee.set(memberId, (payByEmployee.get(memberId) || 0) + share)
    }
  }

  const companyPayByEmployee = [...payByEmployee.entries()].map(([employeeId, amount]) => ({
    employeeId,
    amount: Math.round(amount)
  }))

  return {
    advanceTotal,
    expenseAdvanceTotal,
    expenseReimburseTotal,
    employeeReturn,
    companyPay,
    balance: companyPay - employeeReturn,
    companyPayByEmployee
  }
}

const formatTrip = async (trip) => {
  const formatted = formatDocument(trip)
  if (!formatted) return null

  const memberIds = (trip.memberIds || []).map((id) => id.toString())
  const orderIds = (trip.orderIds || []).map((id) => id.toString())

  const [membersResult, ordersResult] = await Promise.all([
    memberIds.length
      ? employeeModel.findMany(
        { _id: { $in: memberIds.map((id) => new ObjectId(id)) } },
        { limit: memberIds.length, skip: 0 }
      )
      : Promise.resolve({ items: [] }),
    orderIds.length
      ? orderModel.findMany(
        { _id: { $in: orderIds.map((id) => new ObjectId(id)) } },
        { limit: orderIds.length, skip: 0 }
      )
      : Promise.resolve({ items: [] })
  ])

  const memberMap = new Map(
    membersResult.items.map((item) => [item._id.toString(), item.fullName])
  )

  const orderDealerIds = []
  const orderWarehouseIds = []
  const orderDeliveryIds = []
  const orderMap = new Map(
    ordersResult.items.map((item) => {
      const total = Number(item.total) || 0
      const costTotal = Math.max(0, Number(item.costTotal) || 0)
      const cancelled = item.status === orderModel.ORDER_STATUS.CANCELLED
      const grossProfit = cancelled
        ? 0
        : item.grossProfit !== undefined && item.grossProfit !== null
          ? Number(item.grossProfit) || 0
          : Math.round(total - costTotal)
      const deliveryIds = []
      if (Array.isArray(item.deliveryEmployeeIds)) {
        for (const id of item.deliveryEmployeeIds) {
          if (id) deliveryIds.push(id.toString())
        }
      }
      if (item.deliveryEmployeeId) {
        deliveryIds.push(item.deliveryEmployeeId.toString())
      }
      const uniqueDelivery = [...new Set(deliveryIds)]
      const dealerId = item.dealerId ? item.dealerId.toString() : null
      const warehouseId = item.warehouseId ? item.warehouseId.toString() : null
      if (dealerId) orderDealerIds.push(dealerId)
      if (warehouseId) orderWarehouseIds.push(warehouseId)
      orderDeliveryIds.push(...uniqueDelivery)
      return [
        item._id.toString(),
        {
          code: item.code,
          total,
          costTotal,
          grossProfit,
          status: item.status,
          paymentStatus: item.paymentStatus || '',
          paidAmount: Math.max(0, Number(item.paidAmount) || 0),
          customerName: item.customerName || '',
          customerPhone: item.customerPhone || '',
          shippingAddress: item.shippingAddress || '',
          shippingContactName: item.shippingContactName || '',
          shippingPhone: item.shippingPhone || '',
          shippingNote: item.shippingNote || '',
          shippingDate: item.shippingDate || null,
          deliveredAt: item.deliveredAt || null,
          warehouseId,
          dealerId,
          deliveryEmployeeIds: uniqueDelivery,
          itemCount: Array.isArray(item.items) ? item.items.length : 0
        }
      ]
    })
  )

  const stopDealerIds = (trip.stops || [])
    .filter((stop) => stop.dealerId)
    .map((stop) => stop.dealerId.toString())
  const dealerIds = [...new Set([...stopDealerIds, ...orderDealerIds])]
  const warehouseIds = [...new Set(orderWarehouseIds)]
  const deliveryLookupIds = [
    ...new Set([...orderDeliveryIds, ...memberIds])
  ]

  const [dealersResult, warehousesResult, deliveryEmployees] = await Promise.all([
    dealerIds.length
      ? dealerModel.findMany(
        { _id: { $in: dealerIds.map((id) => new ObjectId(id)) } },
        { limit: dealerIds.length, skip: 0 }
      )
      : Promise.resolve({ items: [] }),
    warehouseIds.length
      ? warehouseModel.findMany(
        { _id: { $in: warehouseIds.map((id) => new ObjectId(id)) } },
        { limit: warehouseIds.length, skip: 0 }
      )
      : Promise.resolve({ items: [] }),
    deliveryLookupIds.length
      ? employeeModel.findMany(
        { _id: { $in: deliveryLookupIds.map((id) => new ObjectId(id)) } },
        { limit: deliveryLookupIds.length, skip: 0 }
      )
      : Promise.resolve({ items: [] })
  ])

  const dealerMap = new Map(
    dealersResult.items.map((item) => [item._id.toString(), item.name])
  )
  const warehouseMap = new Map(
    warehousesResult.items.map((item) => [item._id.toString(), item.name])
  )
  const originWarehouse = await resolveOriginWarehouse(
    warehousesResult.items,
    orderWarehouseIds
  )
  for (const item of deliveryEmployees.items) {
    memberMap.set(item._id.toString(), item.fullName)
  }

  const preview = calcSettlementPreview(trip)
  const linkedOrders = orderIds.map((id) => {
    const base = orderMap.get(id) || {
      code: '—',
      total: 0,
      costTotal: 0,
      grossProfit: 0,
      status: '',
      paymentStatus: '',
      paidAmount: 0,
      customerName: '',
      customerPhone: '',
      shippingAddress: '',
      shippingContactName: '',
      shippingPhone: '',
      shippingNote: '',
      shippingDate: null,
      deliveredAt: null,
      warehouseId: null,
      dealerId: null,
      deliveryEmployeeIds: [],
      itemCount: 0
    }
    const deliveryNames = (base.deliveryEmployeeIds || [])
      .map((empId) => memberMap.get(empId) || '')
      .filter(Boolean)
    return {
      id,
      ...base,
      dealerName: base.dealerId ? dealerMap.get(base.dealerId) || '' : '',
      warehouseName: base.warehouseId
        ? warehouseMap.get(base.warehouseId) || ''
        : '',
      deliveryEmployeeNames: deliveryNames,
      deliveryEmployeeName: deliveryNames.join(', ')
    }
  })
  const orderRevenue = linkedOrders
    .filter((o) => o.status && o.status !== orderModel.ORDER_STATUS.CANCELLED)
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const orderCostTotal = linkedOrders
    .filter((o) => o.status && o.status !== orderModel.ORDER_STATUS.CANCELLED)
    .reduce((sum, o) => sum + (Number(o.costTotal) || 0), 0)
  const orderGrossProfit = linkedOrders
    .filter((o) => o.status && o.status !== orderModel.ORDER_STATUS.CANCELLED)
    .reduce((sum, o) => sum + (Number(o.grossProfit) || 0), 0)
  const tripExpenseTotal =
    (Number(preview.expenseAdvanceTotal) || 0) +
    (Number(preview.expenseReimburseTotal) || 0)
  const tripNetProfit = Math.round(orderGrossProfit - tripExpenseTotal)

  return {
    ...formatted,
    memberIds,
    orderIds,
    members: memberIds.map((id) => ({
      id,
      fullName: memberMap.get(id) || '—'
    })),
    orders: linkedOrders,
    stops: (trip.stops || []).map((stop, index) => ({
      ...stop,
      id: stop.id,
      seq: index + 1,
      dealerId: stop.dealerId ? stop.dealerId.toString() : null,
      dealerName: stop.dealerId ? dealerMap.get(stop.dealerId.toString()) || '' : '',
      orderId: stop.orderId ? stop.orderId.toString() : null
    })),
    originWarehouse,
    advances: (trip.advances || []).map((advance) => ({
      ...advance,
      createdBy: advance.createdBy?.toString?.() || advance.createdBy || null,
      ...formatReceiptFields(advance)
    })),
    expenses: (trip.expenses || []).map((expense) => {
      const paidBy =
        expense.paidByEmployeeId?.toString?.() || expense.paidByEmployeeId || null
      return {
        ...expense,
        createdBy: expense.createdBy?.toString?.() || expense.createdBy || null,
        reviewedBy: expense.reviewedBy?.toString?.() || expense.reviewedBy || null,
        paidByEmployeeId: paidBy,
        paidByEmployeeName: paidBy ? memberMap.get(paidBy) || '' : '',
        ...formatReceiptFields(expense)
      }
    }),
    settlementPreview: preview,
    settlement: trip.settlement || null,
    profitSummary: {
      orderRevenue,
      orderCostTotal,
      orderGrossProfit,
      tripExpenseTotal,
      tripNetProfit
    }
  }
}

const syncOrderTripLinks = async (tripId, nextOrderIds = [], prevOrderIds = []) => {
  const nextSet = new Set(nextOrderIds.map(String))
  const prevSet = new Set(prevOrderIds.map(String))

  for (const orderId of nextSet) {
    await orderModel.update(orderId, { tripId })
  }
  for (const orderId of prevSet) {
    if (!nextSet.has(orderId)) {
      await orderModel.update(orderId, { tripId: null })
    }
  }
}

const createNew = async (reqBody, userId) => {
  const startDate = parseDate(reqBody.startDate, 'Ngày đi')
  const endDate = parseDate(reqBody.endDate, 'Ngày về')
  if (!startDate || !endDate) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Vui lòng chọn ngày đi và ngày về!')
  }
  if (endDate < startDate) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Ngày về phải sau ngày đi!')
  }

  const memberIds = Array.isArray(reqBody.memberIds) ? reqBody.memberIds : []
  if (!memberIds.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Chọn ít nhất một nhân viên đi chuyến!')
  }

  for (const memberId of memberIds) {
    const employee = await employeeModel.findOneById(memberId)
    if (!employee) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Nhân viên không hợp lệ!')
    }
  }

  const orderIds = Array.isArray(reqBody.orderIds) ? reqBody.orderIds : []
  for (const orderId of orderIds) {
    const order = await orderModel.findOneById(orderId)
    if (!order) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Đơn hàng không hợp lệ!')
    }
  }
  await assertOrdersCoveredByMembers(memberIds, orderIds)

  const stops = orderIds.length
    ? await buildDeliveryStopsFromOrders(orderIds, startDate)
    : []

  const code = await generateDocumentCode(tripModel.TRIP_COLLECTION_NAME, 'CT')
  const created = await tripModel.createNew({
    code,
    title: reqBody.title || '',
    region: reqBody.region || '',
    startDate,
    endDate,
    status: reqBody.status || tripModel.TRIP_STATUS.DRAFT,
    memberIds,
    orderIds,
    stops,
    advances: [],
    expenses: [],
    settlement: null,
    note: reqBody.note || '',
    createdBy: userId
  })

  if (orderIds.length) {
    await syncOrderTripLinks(created.insertedId.toString(), orderIds, [])
  }

  const formatted = await getDetails(created.insertedId.toString())
  staffNotifyService.onTripCreated(formatted)
  return formatted
}

const getList = async (query, actorUserId, actorRoles) => {
  const findQuery = {}
  if (query.status) findQuery.status = query.status

  const searchFilter = buildSearchFilter(
    ['code', 'title', 'region'],
    query.search
  )

  // Sales/warehouse: chỉ thấy chuyến mình tạo hoặc mình là người đi
  let scopeFilter = null
  if (!hasAnyRole(actorRoles, 'admin', 'accountant')) {
    const employeeResult = await employeeModel.findMany(
      { userId: new ObjectId(actorUserId) },
      { limit: 20, skip: 0 }
    )
    const employeeIds = employeeResult.items.map((item) => item._id)
    scopeFilter = {
      $or: [
        { createdBy: new ObjectId(actorUserId) },
        ...(employeeIds.length ? [{ memberIds: { $in: employeeIds } }] : [])
      ]
    }
  }

  if (scopeFilter && searchFilter) {
    findQuery.$and = [scopeFilter, searchFilter]
  } else if (scopeFilter) {
    Object.assign(findQuery, scopeFilter)
  } else if (searchFilter) {
    Object.assign(findQuery, searchFilter)
  }

  const pagination = parsePaginationQuery(query)
  const result = await tripModel.findMany(findQuery, {
    limit: pagination.limit,
    skip: pagination.skip
  })

  const items = []
  for (const trip of result.items) {
    items.push(await formatTrip(trip))
  }

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

const getDetails = async (tripId, actorUserId = null, actorRole = null) => {
  const trip = await tripModel.findOneById(tripId)
  if (!trip) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến công tác!')
  }
  if (actorUserId) {
    await assertCanOperateTrip(trip, actorUserId, actorRole)
  }
  return await formatTrip(trip)
}

const update = async (tripId, updateData, actorUserId, actorRole) => {
  const trip = await tripModel.findOneById(tripId)
  if (!trip) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến công tác!')
  }
  await assertCanOperateTrip(trip, actorUserId, actorRole)
  assertEditable(trip)

  const dataToUpdate = {}
  if (updateData.title !== undefined) dataToUpdate.title = updateData.title
  if (updateData.region !== undefined) dataToUpdate.region = updateData.region
  if (updateData.note !== undefined) dataToUpdate.note = updateData.note
  if (updateData.status !== undefined) {
    if (
      ![
        tripModel.TRIP_STATUS.DRAFT,
        tripModel.TRIP_STATUS.IN_PROGRESS,
        tripModel.TRIP_STATUS.SETTLEMENT,
        tripModel.TRIP_STATUS.CANCELLED
      ].includes(updateData.status)
    ) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Trạng thái không hợp lệ!')
    }
    dataToUpdate.status = updateData.status
  }
  if (updateData.startDate !== undefined) {
    dataToUpdate.startDate = parseDate(updateData.startDate, 'Ngày đi')
  }
  if (updateData.endDate !== undefined) {
    dataToUpdate.endDate = parseDate(updateData.endDate, 'Ngày về')
  }

  let nextOrderIds
  if (updateData.memberIds !== undefined) {
    if (!Array.isArray(updateData.memberIds) || !updateData.memberIds.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Chọn ít nhất một nhân viên đi chuyến!')
    }
    dataToUpdate.memberIds = updateData.memberIds
  }
  if (updateData.orderIds !== undefined) {
    nextOrderIds = Array.isArray(updateData.orderIds) ? updateData.orderIds : []
    dataToUpdate.orderIds = nextOrderIds
  }

  const finalMemberIds =
    updateData.memberIds !== undefined
      ? updateData.memberIds
      : (trip.memberIds || []).map((id) => id.toString())
  const finalOrderIds =
    nextOrderIds !== undefined
      ? nextOrderIds
      : (trip.orderIds || []).map((id) => id.toString())

  if (
    updateData.memberIds !== undefined ||
    updateData.orderIds !== undefined
  ) {
    await assertOrdersCoveredByMembers(finalMemberIds, finalOrderIds)
  }

  await tripModel.update(tripId, dataToUpdate)

  if (nextOrderIds) {
    await syncOrderTripLinks(
      tripId,
      nextOrderIds,
      (trip.orderIds || []).map((id) => id.toString())
    )
  }

  const formatted = await getDetails(tripId)

  if (
    dataToUpdate.status === tripModel.TRIP_STATUS.IN_PROGRESS &&
    trip.status !== tripModel.TRIP_STATUS.IN_PROGRESS
  ) {
    staffNotifyService.onTripStarted(formatted)
  }

  if (
    dataToUpdate.status === tripModel.TRIP_STATUS.SETTLEMENT &&
    trip.status !== tripModel.TRIP_STATUS.SETTLEMENT
  ) {
    staffNotifyService.onTripAwaitingSettlement(formatted, actorUserId)
  }

  return formatted
}

const deleteOne = async (tripId, actorUserId, actorRoles) => {
  const trip = await tripModel.findOneById(tripId)
  if (!trip) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến công tác!')
  }
  await assertCanOperateTrip(trip, actorUserId, actorRoles)
  if (trip.status === tripModel.TRIP_STATUS.CLOSED) {
    throw new ApiError(StatusCodes.CONFLICT, 'Không thể xóa chuyến đã quyết toán!')
  }

  await syncOrderTripLinks(tripId, [], (trip.orderIds || []).map((id) => id.toString()))
  await tripModel.deleteOne(tripId)
  return { message: 'Đã xóa chuyến công tác thành công!' }
}

const addStop = async (tripId, body, actorUserId, actorRole) => {
  const trip = await tripModel.findOneById(tripId)
  if (!trip) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến!')
  await assertCanOperateTrip(trip, actorUserId, actorRole)
  assertEditable(trip)

  let geo = normalizeGeoLocation(body)
  let dealerId = body.dealerId ? new ObjectId(body.dealerId) : null
  let location = body.location || ''

  // Chưa bắt GPS tay → thử GPS đại lý hoặc geocode địa chỉ
  if (!geo) {
    let dealer = null
    if (dealerId) {
      dealer = await dealerModel.findOneById(dealerId.toString())
      if (!location.trim() && dealer?.address) {
        location = String(dealer.address).trim()
      }
      if (hasValidLatLng(dealer)) {
        geo = {
          lat: dealer.lat,
          lng: dealer.lng,
          accuracy: null,
          locationCapturedAt: new Date(),
          locationSource: 'dealer'
        }
      }
    }

    if (!geo && location.trim()) {
      const coords = await geocodeAddress(location)
      if (coords) {
        geo = {
          lat: coords.lat,
          lng: coords.lng,
          accuracy: null,
          locationCapturedAt: new Date(),
          locationSource: 'geocode'
        }
        if (dealer && !hasValidLatLng(dealer) && dealer.address) {
          const dealerAddress = String(dealer.address).trim()
          if (dealerAddress && location.trim() === dealerAddress) {
            await dealerModel.update(dealer._id.toString(), {
              lat: coords.lat,
              lng: coords.lng
            })
          }
        }
      }
    }
  }

  const stop = {
    id: newId(),
    date: parseDate(body.date, 'Ngày điểm dừng') || trip.startDate,
    dealerId,
    location,
    purpose: body.purpose || tripModel.STOP_PURPOSE.DELIVERY,
    note: body.note || '',
    ...(geo || {})
  }

  const stops = [...(trip.stops || [])]
  const insertAt =
    body.insertAt !== undefined && body.insertAt !== null && body.insertAt !== ''
      ? Number(body.insertAt)
      : null
  if (Number.isInteger(insertAt) && insertAt >= 0 && insertAt <= stops.length) {
    stops.splice(insertAt, 0, stop)
  } else {
    stops.push(stop)
  }

  await tripModel.update(tripId, { stops })
  return await getDetails(tripId)
}

const removeStop = async (tripId, stopId, actorUserId, actorRole) => {
  const trip = await tripModel.findOneById(tripId)
  if (!trip) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến!')
  await assertCanOperateTrip(trip, actorUserId, actorRole)
  assertEditable(trip)
  await tripModel.update(tripId, {
    stops: (trip.stops || []).filter((item) => item.id !== stopId)
  })
  return await getDetails(tripId)
}

const reorderStops = async (tripId, body, actorUserId, actorRole) => {
  const trip = await tripModel.findOneById(tripId)
  if (!trip) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến!')
  await assertCanOperateTrip(trip, actorUserId, actorRole)
  assertEditable(trip)

  const stopIds = Array.isArray(body.stopIds) ? body.stopIds.map(String) : []
  const current = trip.stops || []
  if (stopIds.length !== current.length) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Danh sách điểm dừng không khớp (thiếu hoặc thừa điểm)!'
    )
  }

  const byId = new Map(current.map((item) => [String(item.id), item]))
  const next = []
  for (const id of stopIds) {
    const stop = byId.get(id)
    if (!stop) {
      throw new ApiError(StatusCodes.BAD_REQUEST, `Không tìm thấy điểm dừng ${id}!`)
    }
    next.push(stop)
    byId.delete(id)
  }
  if (byId.size > 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Danh sách điểm dừng không đầy đủ!')
  }

  await tripModel.update(tripId, { stops: next })
  return await getDetails(tripId)
}

const addAdvance = async (tripId, body, userId) => {
  const trip = await tripModel.findOneById(tripId)
  if (!trip) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến!')
  assertEditable(trip)

  const amount = Number(body.amount) || 0
  if (amount <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Số tiền ứng phải lớn hơn 0!')
  }

  const receiptUrls = normalizeReceiptUrls(body)
  const advance = {
    id: newId(),
    amount,
    note: body.note || '',
    receiptUrls,
    receiptUrl: receiptUrls[0] || '',
    createdBy: userId,
    createdAt: new Date()
  }

  await tripModel.update(tripId, {
    advances: [...(trip.advances || []), advance],
    status:
      trip.status === tripModel.TRIP_STATUS.DRAFT
        ? tripModel.TRIP_STATUS.IN_PROGRESS
        : trip.status
  })

  const formatted = await getDetails(tripId)

  // Chỉ notify tạm ứng — tránh double với tripStarted khi draft → in_progress
  staffNotifyService.onTripAdvance(formatted, advance, userId)

  return formatted
}

const resolveExpenseFunding = (trip, body) => {
  const amount = Number(body.amount) || 0
  if (amount <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Số tiền chi phải lớn hơn 0!')
  }

  const funding = body.funding || tripModel.EXPENSE_FUNDING.ADVANCE
  let paidByEmployeeId = null
  if (funding === tripModel.EXPENSE_FUNDING.REIMBURSE) {
    paidByEmployeeId = body.paidByEmployeeId ? String(body.paidByEmployeeId) : null
    if (!paidByEmployeeId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Chọn nhân viên đã tự bỏ tiền để hoàn lại đúng người!'
      )
    }
    const memberIds = (trip.memberIds || []).map((id) => id.toString())
    if (!memberIds.includes(paidByEmployeeId)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Nhân viên tự bỏ tiền phải là người đi trong chuyến!'
      )
    }
  }

  const receiptUrls = normalizeReceiptUrls(body)
  const geo = normalizeGeoLocation(body)
  return {
    amount,
    funding,
    paidByEmployeeId,
    category: body.category || tripModel.EXPENSE_CATEGORY.OTHER,
    date: parseDate(body.date, 'Ngày chi') || new Date(),
    receiptUrls,
    receiptUrl: receiptUrls[0] || '',
    note: body.note || '',
    ...(geo || {})
  }
}

const addExpense = async (tripId, body, userId, actorRole) => {
  const trip = await tripModel.findOneById(tripId)
  if (!trip) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến!')
  await assertCanOperateTrip(trip, userId, actorRole)
  assertEditable(trip)

  const fields = resolveExpenseFunding(trip, body)
  const expense = {
    id: newId(),
    ...fields,
    status: tripModel.EXPENSE_STATUS.PENDING,
    createdBy: userId,
    createdAt: new Date(),
    reviewedBy: null,
    reviewedAt: null
  }

  await tripModel.update(tripId, {
    expenses: [...(trip.expenses || []), expense],
    status:
      trip.status === tripModel.TRIP_STATUS.DRAFT
        ? tripModel.TRIP_STATUS.IN_PROGRESS
        : trip.status
  })
  const formatted = await getDetails(tripId)
  staffNotifyService.onTripExpensePending(formatted, expense, userId)
  return formatted
}

const updateAdvance = async (tripId, advanceId, body) => {
  const trip = await tripModel.findOneById(tripId)
  if (!trip) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến!')
  assertEditable(trip)

  const amount = Number(body.amount) || 0
  if (amount <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Số tiền ứng phải lớn hơn 0!')
  }

  const advances = trip.advances || []
  const existing = advances.find((item) => item.id === advanceId)
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy khoản tạm ứng!')
  }

  await tripModel.update(tripId, {
    advances: advances.map((item) =>
      item.id !== advanceId
        ? item
        : {
            ...item,
            amount,
            note: body.note !== undefined ? body.note || '' : item.note,
            ...(body.receiptUrls !== undefined || body.receiptUrl !== undefined
              ? (() => {
                  const receiptUrls = normalizeReceiptUrls(body)
                  return {
                    receiptUrls,
                    receiptUrl: receiptUrls[0] || ''
                  }
                })()
              : {}),
            updatedAt: new Date()
          }
    )
  })
  return await getDetails(tripId)
}

const removeAdvance = async (tripId, advanceId) => {
  const trip = await tripModel.findOneById(tripId)
  if (!trip) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến!')
  assertEditable(trip)

  const advances = trip.advances || []
  if (!advances.some((item) => item.id === advanceId)) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy khoản tạm ứng!')
  }

  await tripModel.update(tripId, {
    advances: advances.filter((item) => item.id !== advanceId)
  })
  return await getDetails(tripId)
}

const updateExpense = async (tripId, expenseId, body, userId, actorRole) => {
  const trip = await tripModel.findOneById(tripId)
  if (!trip) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến!')
  await assertCanOperateTrip(trip, userId, actorRole)
  assertEditable(trip)

  const expenses = trip.expenses || []
  const existing = expenses.find((item) => item.id === expenseId)
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy khoản chi!')
  }
  if (existing.status !== tripModel.EXPENSE_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'Chỉ được sửa khoản chi đang chờ duyệt!'
    )
  }

  const fields = resolveExpenseFunding(trip, body)
  await tripModel.update(tripId, {
    expenses: expenses.map((item) =>
      item.id !== expenseId
        ? item
        : {
            ...item,
            ...fields,
            updatedAt: new Date()
          }
    )
  })
  return await getDetails(tripId)
}

const removeExpense = async (tripId, expenseId, userId, actorRole) => {
  const trip = await tripModel.findOneById(tripId)
  if (!trip) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến!')
  await assertCanOperateTrip(trip, userId, actorRole)
  assertEditable(trip)

  const expenses = trip.expenses || []
  const existing = expenses.find((item) => item.id === expenseId)
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy khoản chi!')
  }
  if (existing.status !== tripModel.EXPENSE_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'Chỉ được xóa khoản chi đang chờ duyệt!'
    )
  }

  await tripModel.update(tripId, {
    expenses: expenses.filter((item) => item.id !== expenseId)
  })
  return await getDetails(tripId)
}

const reviewExpense = async (tripId, expenseId, body, userId) => {
  const trip = await tripModel.findOneById(tripId)
  if (!trip) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến!')
  assertEditable(trip)

  if (![tripModel.EXPENSE_STATUS.APPROVED, tripModel.EXPENSE_STATUS.REJECTED].includes(body.status)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Trạng thái duyệt không hợp lệ!')
  }

  const existing = (trip.expenses || []).find((item) => item.id === expenseId)
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy khoản chi!')
  }

  const expenses = (trip.expenses || []).map((item) => {
    if (item.id !== expenseId) return item
    return {
      ...item,
      status: body.status,
      reviewedBy: userId,
      reviewedAt: new Date()
    }
  })

  await tripModel.update(tripId, { expenses })
  const formatted = await getDetails(tripId)

  staffNotifyService.onTripExpenseReviewed(
    formatted,
    existing,
    body.status,
    userId
  )

  return formatted
}

const settle = async (tripId, body, userId) => {
  const trip = await tripModel.findOneById(tripId)
  if (!trip) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến!')
  if (trip.status === tripModel.TRIP_STATUS.CLOSED) {
    throw new ApiError(StatusCodes.CONFLICT, 'Chuyến đã được quyết toán!')
  }

  const pending = (trip.expenses || []).some(
    (item) => item.status === tripModel.EXPENSE_STATUS.PENDING
  )
  if (pending) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'Còn khoản chi chưa duyệt. Hãy duyệt hết trước khi quyết toán!'
    )
  }

  const preview = calcSettlementPreview(trip)
  const settlement = {
    ...preview,
    note: body.note || '',
    settledAt: new Date(),
    settledBy: userId
  }

  await tripModel.update(tripId, {
    settlement,
    status: tripModel.TRIP_STATUS.CLOSED
  })
  const formatted = await getDetails(tripId)
  staffNotifyService.onTripSettled(formatted, settlement, userId)
  return formatted
}

export const tripService = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne,
  addStop,
  removeStop,
  reorderStops,
  addAdvance,
  updateAdvance,
  removeAdvance,
  addExpense,
  updateExpense,
  removeExpense,
  reviewExpense,
  settle
}
