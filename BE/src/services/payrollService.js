import { ObjectId } from 'mongodb'
import { payrollModel } from '~/models/payrollModel'
import { employeeModel } from '~/models/employeeModel'
import { orderModel } from '~/models/orderModel'
import { tripModel } from '~/models/tripModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { formatDocument } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { hasAnyRole } from '~/utils/roles'

const canViewAllPayroll = (roles) => hasAnyRole(roles, 'admin', 'accountant')

const findEmployeeIdsForUser = async (userId) => {
  if (!userId) return []
  const result = await employeeModel.findMany(
    { userId: new ObjectId(userId) },
    { limit: 20, skip: 0 }
  )
  return result.items.map((item) => item._id.toString())
}

const scopePayrollForViewer = (payroll, employeeIds) => {
  if (!payroll) return null
  if (!employeeIds?.length) {
    return { ...payroll, lines: [] }
  }
  const idSet = new Set(employeeIds)
  return {
    ...payroll,
    lines: (payroll.lines || []).filter((line) => idSet.has(String(line.employeeId)))
  }
}

const periodBounds = (period) => {
  if (!/^\d{4}-\d{2}$/.test(period)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Kỳ lương không hợp lệ (YYYY-MM)!')
  }
  const [year, month] = period.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0))
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0))
  return { start, end }
}

/** Cty trả NV — cùng công thức settlementPreview trên trang chuyến */
const resolveTripCompanyPay = (trip) => {
  const settlement = trip.settlement || {}
  if (settlement.companyPay != null && settlement.companyPay !== '') {
    return Math.max(0, Number(settlement.companyPay) || 0)
  }

  // Schema seed cũ
  if (settlement.totalExpenseReimburse != null) {
    const advanceTotal = Number(settlement.totalAdvance) || 0
    const expenseAdvanceTotal = Number(settlement.totalExpenseAdvance) || 0
    const expenseReimburseTotal = Number(settlement.totalExpenseReimburse) || 0
    return (
      expenseReimburseTotal + Math.max(0, expenseAdvanceTotal - advanceTotal)
    )
  }

  const advanceTotal = (trip.advances || []).reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  )
  const approved = (trip.expenses || []).filter((item) => item.status === 'approved')
  const expenseAdvanceTotal = approved
    .filter((item) => item.funding === 'advance')
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const expenseReimburseTotal = approved
    .filter((item) => item.funding === 'reimburse')
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  return expenseReimburseTotal + Math.max(0, expenseAdvanceTotal - advanceTotal)
}

/** Phân bổ hoàn CT theo NV — ưu tiên settlement.companyPayByEmployee */
const resolveTripPayByEmployee = (trip) => {
  const settlement = trip.settlement || {}
  const payByEmployee = new Map()

  if (Array.isArray(settlement.companyPayByEmployee) && settlement.companyPayByEmployee.length) {
    for (const row of settlement.companyPayByEmployee) {
      const id = row.employeeId?.toString?.() || row.employeeId
      if (!id) continue
      payByEmployee.set(id, (payByEmployee.get(id) || 0) + (Number(row.amount) || 0))
    }
    return payByEmployee
  }

  // Fallback: tính lại từ chi phí (chi cũ / chưa có breakdown)
  const members = (trip.memberIds || []).map((id) => id.toString())
  const approved = (trip.expenses || []).filter((item) => item.status === 'approved')
  for (const expense of approved) {
    if (expense.funding !== 'reimburse') continue
    const amount = Number(expense.amount) || 0
    const paidBy =
      expense.paidByEmployeeId?.toString?.() || expense.paidByEmployeeId || null
    if (paidBy) {
      payByEmployee.set(paidBy, (payByEmployee.get(paidBy) || 0) + amount)
    } else if (members.length) {
      const share = amount / members.length
      for (const memberId of members) {
        payByEmployee.set(memberId, (payByEmployee.get(memberId) || 0) + share)
      }
    }
  }

  const advanceTotal = (trip.advances || []).reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  )
  const expenseAdvanceTotal = approved
    .filter((item) => item.funding === 'advance')
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const advanceTopUp = Math.max(0, expenseAdvanceTotal - advanceTotal)
  if (advanceTopUp > 0 && members.length) {
    const share = advanceTopUp / members.length
    for (const memberId of members) {
      payByEmployee.set(memberId, (payByEmployee.get(memberId) || 0) + share)
    }
  }

  return payByEmployee
}

const formatPayroll = (doc) => {
  const formatted = formatDocument(doc)
  if (!formatted) return null
  return {
    ...formatted,
    lockedBy: doc.lockedBy ? doc.lockedBy.toString() : null,
    lines: (doc.lines || []).map((line) => ({
      ...line,
      employeeId: line.employeeId?.toString?.() || line.employeeId
    }))
  }
}

const buildLinesForPeriod = async (period) => {
  const { start, end } = periodBounds(period)
  const employees = await employeeModel.findMany(
    { status: employeeModel.EMPLOYEE_STATUS.ACTIVE },
    { limit: 500, skip: 0 }
  )

  const completedOrders = await orderModel.findMany(
    {
      status: orderModel.ORDER_STATUS.COMPLETED,
      createdAt: { $gte: start, $lt: end }
    },
    { limit: 5000, skip: 0 }
  )

  const closedTrips = await tripModel.findMany(
    {
      status: tripModel.TRIP_STATUS.CLOSED,
      'settlement.settledAt': { $gte: start, $lt: end }
    },
    { limit: 1000, skip: 0 }
  )

  const salesByUser = new Map()
  for (const order of completedOrders.items) {
    const userId = order.createdBy?.toString?.()
    if (!userId) continue
    salesByUser.set(userId, (salesByUser.get(userId) || 0) + (Number(order.total) || 0))
  }

  // Hoàn CT theo NV đã tự bỏ (không chia đều cả chuyến)
  const tripPayByEmployee = new Map()
  for (const trip of closedTrips.items) {
    const payMap = resolveTripPayByEmployee(trip)
    for (const [memberId, amount] of payMap.entries()) {
      if (amount <= 0) continue
      tripPayByEmployee.set(
        memberId,
        (tripPayByEmployee.get(memberId) || 0) + amount
      )
    }
  }

  return employees.items.map((employee) => {
    const employeeId = employee._id.toString()
    const userId = employee.userId ? employee.userId.toString() : null
    const baseSalary = Number(employee.baseSalary) || 0
    const allowance = Number(employee.allowance) || 0
    const commissionPercent = Number(employee.commissionPercent) || 0
    const salesTotal = userId ? salesByUser.get(userId) || 0 : 0
    const commission = Math.round((salesTotal * commissionPercent) / 100)
    const tripReimburse = Math.round(tripPayByEmployee.get(employeeId) || 0)
    const net = baseSalary + allowance + commission + tripReimburse

    return {
      employeeId,
      employeeCode: employee.code,
      employeeName: employee.fullName,
      baseSalary,
      allowance,
      commissionPercent,
      salesTotal,
      commission,
      tripReimburse,
      net
    }
  })
}

const getList = async (query, actorUserId, actorRole) => {
  const pagination = parsePaginationQuery(query)

  if (!canViewAllPayroll(actorRole)) {
    const employeeIds = await findEmployeeIdsForUser(actorUserId)
    const all = await payrollModel.findMany({}, { limit: 500, skip: 0 })
    const filtered = all.items
      .map(formatPayroll)
      .map((item) => scopePayrollForViewer(item, employeeIds))
      .filter((item) => item && item.lines.length > 0)

    const pageItems = filtered.slice(
      pagination.skip,
      pagination.skip + pagination.limit
    )

    return buildPaginationResult(
      {
        items: pageItems,
        total: filtered.length,
        limit: pagination.limit,
        skip: pagination.skip
      },
      pagination.page
    )
  }

  const result = await payrollModel.findMany({}, {
    limit: pagination.limit,
    skip: pagination.skip
  })

  return buildPaginationResult(
    {
      items: result.items.map(formatPayroll),
      total: result.total,
      limit: pagination.limit,
      skip: pagination.skip
    },
    pagination.page
  )
}

const getDetails = async (id, actorUserId = null, actorRole = null) => {
  const doc = await payrollModel.findOneById(id)
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy bảng lương!')

  const formatted = formatPayroll(doc)
  if (!actorUserId || canViewAllPayroll(actorRole)) {
    return formatted
  }

  const employeeIds = await findEmployeeIdsForUser(actorUserId)
  const scoped = scopePayrollForViewer(formatted, employeeIds)
  if (!scoped?.lines?.length) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xem bảng lương này!')
  }
  return scoped
}

const generate = async (period, userId, note = '') => {
  const existing = await payrollModel.findOneByPeriod(period)
  if (existing && existing.status === payrollModel.PAYROLL_STATUS.LOCKED) {
    throw new ApiError(StatusCodes.CONFLICT, 'Bảng lương tháng này đã khóa!')
  }

  const lines = await buildLinesForPeriod(period)

  if (existing) {
    await payrollModel.update(existing._id.toString(), {
      lines,
      note: note || existing.note || '',
      status: payrollModel.PAYROLL_STATUS.DRAFT
    })
    return await getDetails(existing._id.toString())
  }

  const created = await payrollModel.createNew({
    period,
    status: payrollModel.PAYROLL_STATUS.DRAFT,
    lines,
    note: note || '',
    createdBy: userId
  })

  return await getDetails(created.insertedId.toString())
}

const lock = async (id, userId) => {
  const doc = await payrollModel.findOneById(id)
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy bảng lương!')
  if (doc.status === payrollModel.PAYROLL_STATUS.LOCKED) {
    throw new ApiError(StatusCodes.CONFLICT, 'Bảng lương đã khóa!')
  }

  await payrollModel.update(id, {
    status: payrollModel.PAYROLL_STATUS.LOCKED,
    lockedAt: new Date(),
    lockedBy: userId
  })
  return await getDetails(id)
}

const deleteOne = async (id) => {
  const doc = await payrollModel.findOneById(id)
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy bảng lương!')
  if (doc.status === payrollModel.PAYROLL_STATUS.LOCKED) {
    throw new ApiError(StatusCodes.CONFLICT, 'Không thể xóa bảng lương đã khóa!')
  }
  await payrollModel.deleteOne(id)
  return { message: 'Đã xóa bảng lương thành công!' }
}

export const payrollService = {
  getList,
  getDetails,
  generate,
  lock,
  deleteOne
}
