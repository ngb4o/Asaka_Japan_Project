import { ObjectId } from 'mongodb'
import { tripModel } from '~/models/tripModel'
import { employeeModel } from '~/models/employeeModel'
import { orderModel } from '~/models/orderModel'
import { dealerModel } from '~/models/dealerModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { formatDocument } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { generateDocumentCode } from '~/utils/documentCode'
import { staffNotifyService } from '~/services/staffNotifyService'
import { buildSearchFilter } from '~/utils/search.js'
import { hasAnyRole } from '~/utils/roles'

const newId = () => new ObjectId().toString()

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
  const expenseReimburseTotal = approved
    .filter((item) => item.funding === tripModel.EXPENSE_FUNDING.REIMBURSE)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  const employeeReturn = Math.max(0, advanceTotal - expenseAdvanceTotal)
  const companyPay =
    expenseReimburseTotal + Math.max(0, expenseAdvanceTotal - advanceTotal)

  return {
    advanceTotal,
    expenseAdvanceTotal,
    expenseReimburseTotal,
    employeeReturn,
    companyPay,
    balance: companyPay - employeeReturn
  }
}

const formatTrip = async (trip) => {
  const formatted = formatDocument(trip)
  if (!formatted) return null

  const memberIds = (trip.memberIds || []).map((id) => id.toString())
  const orderIds = (trip.orderIds || []).map((id) => id.toString())
  const dealerIds = [
    ...new Set(
      (trip.stops || [])
        .filter((stop) => stop.dealerId)
        .map((stop) => stop.dealerId.toString())
    )
  ]

  const [membersResult, ordersResult, dealersResult] = await Promise.all([
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
      : Promise.resolve({ items: [] }),
    dealerIds.length
      ? dealerModel.findMany(
        { _id: { $in: dealerIds.map((id) => new ObjectId(id)) } },
        { limit: dealerIds.length, skip: 0 }
      )
      : Promise.resolve({ items: [] })
  ])

  const memberMap = new Map(
    membersResult.items.map((item) => [item._id.toString(), item.fullName])
  )
  const orderMap = new Map(
    ordersResult.items.map((item) => [
      item._id.toString(),
      { code: item.code, total: item.total, status: item.status, customerName: item.customerName }
    ])
  )
  const dealerMap = new Map(
    dealersResult.items.map((item) => [item._id.toString(), item.name])
  )

  const preview = calcSettlementPreview(trip)

  return {
    ...formatted,
    memberIds,
    orderIds,
    members: memberIds.map((id) => ({
      id,
      fullName: memberMap.get(id) || '—'
    })),
    orders: orderIds.map((id) => ({
      id,
      ...(orderMap.get(id) || { code: '—', total: 0, status: '', customerName: '' })
    })),
    stops: (trip.stops || []).map((stop) => ({
      ...stop,
      id: stop.id,
      dealerId: stop.dealerId ? stop.dealerId.toString() : null,
      dealerName: stop.dealerId ? dealerMap.get(stop.dealerId.toString()) || '' : ''
    })),
    advances: trip.advances || [],
    expenses: (trip.expenses || []).map((expense) => ({
      ...expense,
      createdBy: expense.createdBy?.toString?.() || expense.createdBy || null,
      reviewedBy: expense.reviewedBy?.toString?.() || expense.reviewedBy || null
    })),
    settlementPreview: preview,
    settlement: trip.settlement || null
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
    stops: [],
    advances: [],
    expenses: [],
    settlement: null,
    note: reqBody.note || '',
    createdBy: userId
  })

  if (orderIds.length) {
    await syncOrderTripLinks(created.insertedId.toString(), orderIds, [])
  }

  return await getDetails(created.insertedId.toString())
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

  return formatted
}

const deleteOne = async (tripId) => {
  const trip = await tripModel.findOneById(tripId)
  if (!trip) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến công tác!')
  }
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

  const stop = {
    id: newId(),
    date: parseDate(body.date, 'Ngày điểm dừng') || trip.startDate,
    dealerId: body.dealerId ? new ObjectId(body.dealerId) : null,
    location: body.location || '',
    purpose: body.purpose || tripModel.STOP_PURPOSE.DELIVERY,
    note: body.note || ''
  }

  await tripModel.update(tripId, { stops: [...(trip.stops || []), stop] })
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

const addAdvance = async (tripId, body, userId) => {
  const trip = await tripModel.findOneById(tripId)
  if (!trip) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến!')
  assertEditable(trip)

  const amount = Number(body.amount) || 0
  if (amount <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Số tiền ứng phải lớn hơn 0!')
  }

  const advance = {
    id: newId(),
    amount,
    note: body.note || '',
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

  if (trip.status === tripModel.TRIP_STATUS.DRAFT) {
    staffNotifyService.onTripStarted(formatted)
  }

  return formatted
}

const addExpense = async (tripId, body, userId, actorRole) => {
  const trip = await tripModel.findOneById(tripId)
  if (!trip) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến!')
  await assertCanOperateTrip(trip, userId, actorRole)
  assertEditable(trip)

  const amount = Number(body.amount) || 0
  if (amount <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Số tiền chi phải lớn hơn 0!')
  }

  const expense = {
    id: newId(),
    category: body.category || tripModel.EXPENSE_CATEGORY.OTHER,
    amount,
    date: parseDate(body.date, 'Ngày chi') || new Date(),
    funding: body.funding || tripModel.EXPENSE_FUNDING.ADVANCE,
    receiptUrl: body.receiptUrl || '',
    note: body.note || '',
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
  return await getDetails(tripId)
}

const reviewExpense = async (tripId, expenseId, body, userId) => {
  const trip = await tripModel.findOneById(tripId)
  if (!trip) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy chuyến!')
  assertEditable(trip)

  if (![tripModel.EXPENSE_STATUS.APPROVED, tripModel.EXPENSE_STATUS.REJECTED].includes(body.status)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Trạng thái duyệt không hợp lệ!')
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

  if (!expenses.some((item) => item.id === expenseId)) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy khoản chi!')
  }

  await tripModel.update(tripId, { expenses })
  return await getDetails(tripId)
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
  return await getDetails(tripId)
}

export const tripService = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne,
  addStop,
  removeStop,
  addAdvance,
  addExpense,
  reviewExpense,
  settle
}
