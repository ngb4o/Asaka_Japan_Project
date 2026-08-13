import { orderService } from '~/services/orderService'
import { dealerService } from '~/services/dealerService'
import { productService } from '~/services/productService'
import { productCategoryService } from '~/services/productCategoryService'
import { leadService } from '~/services/leadService'
import { tripService } from '~/services/tripService'
import { inventoryService } from '~/services/inventoryService'
import { warehouseService } from '~/services/warehouseService'
import { payrollService } from '~/services/payrollService'
import { newsService } from '~/services/newsService'
import { receivablesService } from '~/services/receivablesService'
import { payablesService } from '~/services/payablesService'
import { supplierService } from '~/services/supplierService'
import { purchaseService } from '~/services/purchaseService'
import { employeeService } from '~/services/employeeService'
import { dashboardService } from '~/services/dashboardService'
import { orderModel } from '~/models/orderModel'
import { tripModel } from '~/models/tripModel'
import { purchaseInvoiceModel } from '~/models/purchaseInvoiceModel'
import { GET_DB } from '~/config/mongodb'
import { hasAnyRole } from '~/utils/roles'
import { createPendingAction } from '~/services/chat/pendingActions'
import { runCrmQuery, CRM_QUERY_COLLECTIONS } from '~/services/chat/crmQuery'
import { describeCrmCollection } from '~/services/chat/crmSchema'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb'
import { OBJECT_ID_RULE } from '~/utils/validators'

const ALL_STAFF = ['sales', 'warehouse', 'accountant']
const SALES_WH = ['sales', 'warehouse']
const SALES_ACC = ['sales', 'accountant']
const WH_ACC = ['warehouse', 'accountant']
const PROFIT_ROLES = ['admin', 'accountant']

const TRIP_STATUS_VALUES = [
  'draft',
  'in_progress',
  'settlement',
  'cancelled'
]
const TRIP_STATUS_LABELS = {
  draft: 'Nháp',
  in_progress: 'Đang đi',
  settlement: 'Chờ quyết toán',
  closed: 'Đã khóa',
  cancelled: 'Đã hủy'
}
const EXPENSE_REVIEW_VALUES = ['approved', 'rejected']
const EXPENSE_CATEGORY_VALUES = [
  'fuel',
  'food',
  'lodging',
  'toll',
  'parking',
  'other'
]

const ORDER_STATUS_LABELS = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  delivering: 'Đang giao',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy'
}

const LEAD_STATUS_LABELS = {
  new: 'Mới',
  contacted: 'Đã liên hệ',
  qualified: 'Đủ điều kiện',
  converted: 'Đã chuyển',
  closed: 'Đã đóng'
}

const labelOrderStatus = (status) =>
  ORDER_STATUS_LABELS[status] || status

const labelLeadStatus = (status) =>
  LEAD_STATUS_LABELS[status] || status

/** Resolve order by Mongo id or business code (O-...). */
const resolveOrder = async (orderIdOrCode) => {
  const raw = String(orderIdOrCode || '').trim()
  if (!raw) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Thiếu mã/id đơn hàng.')
  }
  if (ObjectId.isValid(raw)) {
    try {
      return await orderService.getDetails(raw)
    } catch (err) {
      // fall through to code lookup
      if (err?.statusCode !== StatusCodes.NOT_FOUND) throw err
    }
  }
  const byCode = await orderModel.findOneByCode(raw)
  if (!byCode) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      `Không tìm thấy đơn hàng "${raw}".`
    )
  }
  return orderService.getDetails(byCode._id.toString())
}

/** Resolve trip by Mongo id or business code. */
const resolveTrip = async (tripIdOrCode, userCtx) => {
  const raw = String(tripIdOrCode || '').trim()
  if (!raw) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Thiếu mã/id chuyến.')
  }
  if (ObjectId.isValid(raw) && String(new ObjectId(raw)) === raw) {
    try {
      return await tripService.getDetails(raw, userCtx.userId, userCtx.roles)
    } catch (err) {
      if (err?.statusCode !== StatusCodes.NOT_FOUND) throw err
    }
  }
  const byCode = await tripModel.findOneByCode(raw)
  if (!byCode) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      `Không tìm thấy chuyến "${raw}".`
    )
  }
  return tripService.getDetails(
    byCode._id.toString(),
    userCtx.userId,
    userCtx.roles
  )
}

const resolveProductCategory = async (categoryId, categoryName) => {
  const id = String(categoryId || '').trim()
  if (id && OBJECT_ID_RULE.test(id)) {
    try {
      return await productCategoryService.getDetails(id)
    } catch (err) {
      if (err?.statusCode !== StatusCodes.NOT_FOUND) throw err
    }
  }

  const listed = await productCategoryService.getList({
    status: 'active',
    limit: 100
  })
  const items = listed.items || []
  const needle = String(categoryName || '').trim().toLowerCase()
  if (needle) {
    const exact = items.find(
      (item) => String(item.name || '').trim().toLowerCase() === needle
    )
    if (exact) return exact
    const partial = items.find((item) => {
      const name = String(item.name || '').trim().toLowerCase()
      return name.includes(needle) || needle.includes(name)
    })
    if (partial) return partial
  }

  const names = items.map((item) => item.name).filter(Boolean)
  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    names.length
      ? `Cần chọn loại sản phẩm. Các loại hiện có: ${names.join(', ')}.`
      : 'Chưa có loại sản phẩm. Tạo loại trong mục Sản phẩm trước.'
  )
}

/** Resolve purchase invoice by Mongo id or business code. */
const resolvePurchase = async (invoiceIdOrCode) => {
  const raw = String(invoiceIdOrCode || '').trim()
  if (!raw) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Thiếu mã/id phiếu mua.')
  }
  if (ObjectId.isValid(raw) && String(new ObjectId(raw)) === raw) {
    try {
      return await purchaseService.getDetails(raw)
    } catch (err) {
      if (err?.statusCode !== StatusCodes.NOT_FOUND) throw err
    }
  }
  const doc = await GET_DB()
    .collection(purchaseInvoiceModel.PURCHASE_INVOICE_COLLECTION_NAME)
    .findOne({ code: raw, _destroy: { $ne: true } })
  if (!doc) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      `Không tìm thấy phiếu mua "${raw}".`
    )
  }
  return purchaseService.getDetails(doc._id.toString())
}

const truncateList = (result, limit = 20) => {
  if (!result || typeof result !== 'object') return result
  if (Array.isArray(result.items)) {
    return {
      ...result,
      items: result.items.slice(0, limit),
      truncated: result.items.length > limit,
      shown: Math.min(result.items.length, limit)
    }
  }
  if (Array.isArray(result)) {
    return {
      items: result.slice(0, limit),
      truncated: result.length > limit,
      shown: Math.min(result.length, limit),
      total: result.length
    }
  }
  return result
}

const stripProfit = (data) => {
  if (!data || typeof data !== 'object') return data
  const clone = JSON.parse(JSON.stringify(data))
  const scrub = (obj) => {
    if (!obj || typeof obj !== 'object') return
    if (Array.isArray(obj)) {
      obj.forEach(scrub)
      return
    }
    delete obj.costTotal
    delete obj.costPrice
    delete obj.grossProfit
    delete obj.monthCostTotal
    delete obj.monthGrossProfit
    delete obj.grossProfitChangePercent
    delete obj.costChangePercent
    if (obj.kpis) scrub(obj.kpis)
    Object.values(obj).forEach(scrub)
  }
  scrub(clone)
  return clone
}

const canViewProfit = (userCtx) => hasAnyRole(userCtx.roles, ...PROFIT_ROLES)

const ORDER_STATUS_VALUES = [
  'pending',
  'confirmed',
  'delivering',
  'completed',
  'cancelled'
]
const PAYMENT_STATUS_VALUES = ['unpaid', 'partial', 'paid']
const LEAD_STATUS_VALUES = [
  'new',
  'contacted',
  'qualified',
  'converted',
  'closed'
]

const pickEnum = (value, allowed) => {
  const v = String(value || '').trim()
  return allowed.includes(v) ? v : undefined
}

const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const endOfDay = (date) => {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/** Resolve preset/from/to for order createdAt filter (local server time). */
const resolveCreatedAtRange = (args = {}) => {
  const fromRaw = args.from ? String(args.from).trim() : ''
  const toRaw = args.to ? String(args.to).trim() : ''
  if (fromRaw || toRaw) {
    return {
      from: fromRaw ? startOfDay(new Date(fromRaw)) : undefined,
      to: toRaw ? endOfDay(new Date(toRaw)) : undefined,
      preset: 'custom'
    }
  }

  const preset = String(args.preset || '').trim()
  if (!preset) return { from: undefined, to: undefined, preset: '' }

  const now = new Date()
  let from = startOfDay(now)
  const to = endOfDay(now)

  switch (preset) {
  case 'today':
    break
  case 'thisWeek': {
    const day = from.getDay()
    const mondayOffset = day === 0 ? 6 : day - 1
    from = startOfDay(new Date(from.getFullYear(), from.getMonth(), from.getDate() - mondayOffset))
    break
  }
  case 'lastWeek': {
    const day = from.getDay()
    const mondayOffset = day === 0 ? 6 : day - 1
    const thisMonday = startOfDay(
      new Date(from.getFullYear(), from.getMonth(), from.getDate() - mondayOffset)
    )
    from = startOfDay(new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000))
    return {
      from,
      to: endOfDay(new Date(thisMonday.getTime() - 1)),
      preset
    }
  }
  case 'thisMonth':
    from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1))
    break
  case 'lastMonth': {
    from = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    return {
      from,
      to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      preset
    }
  }
  default:
    return { from: undefined, to: undefined, preset: '' }
  }

  return { from, to, preset }
}

const summarizeOrdersForChat = (result, meta = {}) => {
  const items = (result?.items || []).map((order) => ({
    id: order.id,
    code: order.code,
    status: order.status,
    statusLabel: labelOrderStatus(order.status),
    paymentStatus: order.paymentStatus,
    dealerName: order.dealerName || '',
    total: order.total,
    paidAmount: order.paidAmount,
    createdAt: order.createdAt
  }))
  return {
    ...meta,
    total: result?.total ?? items.length,
    page: result?.page,
    shown: items.length,
    items
  }
}

/**
 * @typedef {object} ChatTool
 * @property {string} name
 * @property {'read'|'write'} kind
 * @property {string[]} requiredRoles
 * @property {object} parameters - JSON Schema
 * @property {string} description
 * @property {(args: object, userCtx: {userId:string,roles:string[]}) => Promise<any>} execute
 * @property {(args: object, userCtx: object) => Promise<{preview:string, execute:Function}>} [prepareWrite]
 */

/** @type {ChatTool[]} */
export const CHAT_TOOLS = [
  {
    name: 'search_orders',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description:
      'Tìm đơn theo mã/trạng thái/thanh toán/đại lý/khoảng ngày. Tuần này → preset=thisWeek. Không gửi status nếu không lọc trạng thái.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        status: {
          type: 'string',
          description:
            'Chỉ một trong: pending|confirmed|delivering|completed|cancelled. Bỏ trống nếu không lọc.'
        },
        paymentStatus: {
          type: 'string',
          description: 'Chỉ unpaid|partial|paid. Bỏ trống nếu không lọc.'
        },
        hasDebt: { type: 'boolean' },
        dealerId: { type: 'string' },
        withoutTrip: { type: 'boolean' },
        preset: {
          type: 'string',
          description:
            'Khoảng ngày tạo đơn: today|thisWeek|lastWeek|thisMonth|lastMonth'
        },
        from: { type: 'string', description: 'YYYY-MM-DD (ưu tiên nếu có preset thì dùng preset)' },
        to: { type: 'string', description: 'YYYY-MM-DD' },
        page: { type: 'integer', minimum: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 50 }
      }
    },
    execute: async (args) => {
      const range = resolveCreatedAtRange(args)
      const status = pickEnum(args.status, ORDER_STATUS_VALUES)
      const paymentStatus = pickEnum(args.paymentStatus, PAYMENT_STATUS_VALUES)
      const result = await orderService.getList({
        search: args.search,
        status,
        paymentStatus,
        dealerId: args.dealerId,
        hasDebt: args.hasDebt ? 'true' : undefined,
        withoutTrip: args.withoutTrip ? 'true' : undefined,
        from: range.from ? range.from.toISOString() : undefined,
        to: range.to ? range.to.toISOString() : undefined,
        page: args.page || 1,
        limit: args.limit || 10
      })
      return summarizeOrdersForChat(result, {
        filter: {
          preset: range.preset || undefined,
          from: range.from ? range.from.toISOString() : undefined,
          to: range.to ? range.to.toISOString() : undefined,
          status: status || undefined,
          paymentStatus: paymentStatus || undefined
        },
        note: range.preset
          ? `Lọc đơn theo ngày tạo (${range.preset}).`
          : undefined
      })
    }
  },
  {
    name: 'get_order',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description: 'Lấy chi tiết một đơn hàng theo id hoặc mã đơn (O-...).',
    parameters: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'Mongo id hoặc mã đơn (vd O-20260804-003)'
        }
      },
      required: ['orderId']
    },
    execute: async (args, userCtx) => {
      const order = await resolveOrder(args.orderId)
      return canViewProfit(userCtx) ? order : stripProfit(order)
    }
  },
  {
    name: 'search_dealers',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description: 'Tìm đại lý theo tên, SĐT, khu vực, trạng thái, hạng.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        status: { type: 'string', description: 'pending|active|inactive' },
        tier: { type: 'string' },
        region: { type: 'string' },
        page: { type: 'integer' },
        limit: { type: 'integer' }
      }
    },
    execute: async (args) =>
      truncateList(await dealerService.getList({ ...args, limit: args.limit || 10 }))
  },
  {
    name: 'get_dealer',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description: 'Chi tiết đại lý theo id.',
    parameters: {
      type: 'object',
      properties: { dealerId: { type: 'string' } },
      required: ['dealerId']
    },
    execute: async (args) => dealerService.getDetails(args.dealerId)
  },
  {
    name: 'search_products',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description: 'Tìm sản phẩm theo tên/SKU/loại/trạng thái.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        categoryId: { type: 'string' },
        status: { type: 'string' },
        page: { type: 'integer' },
        limit: { type: 'integer' }
      }
    },
    execute: async (args, userCtx) => {
      const result = truncateList(
        await productService.getList({ ...args, limit: args.limit || 10 })
      )
      return canViewProfit(userCtx) ? result : stripProfit(result)
    }
  },
  {
    name: 'get_product',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description: 'Chi tiết sản phẩm theo id (giá, tồn tổng, mô tả, quy cách thùng).',
    parameters: {
      type: 'object',
      properties: { productId: { type: 'string' } },
      required: ['productId']
    },
    execute: async (args, userCtx) => {
      const data = await productService.getDetails(args.productId)
      return canViewProfit(userCtx) ? data : stripProfit(data)
    }
  },
  {
    name: 'search_leads',
    kind: 'read',
    requiredRoles: SALES_WH,
    description: 'Tìm lead theo tên, SĐT, trạng thái, loại.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        status: {
          type: 'string',
          description: 'new|contacted|qualified|converted|closed'
        },
        type: { type: 'string', description: 'contact|dealer' },
        page: { type: 'integer' },
        limit: { type: 'integer' }
      }
    },
    execute: async (args) =>
      truncateList(await leadService.getList({ ...args, limit: args.limit || 10 }))
  },
  {
    name: 'get_lead',
    kind: 'read',
    requiredRoles: SALES_WH,
    description: 'Chi tiết lead theo id.',
    parameters: {
      type: 'object',
      properties: { leadId: { type: 'string' } },
      required: ['leadId']
    },
    execute: async (args) => leadService.getDetails(args.leadId)
  },
  {
    name: 'search_trips',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description: 'Tìm chuyến công tác theo mã/trạng thái. Không dùng để xếp hạng chi phí.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        status: {
          type: 'string',
          description: 'draft|in_progress|settlement|closed|cancelled'
        },
        page: { type: 'integer' },
        limit: { type: 'integer' }
      }
    },
    execute: async (args, userCtx) =>
      truncateList(
        await tripService.getList(
          { ...args, limit: args.limit || 10 },
          userCtx.userId,
          userCtx.roles
        )
      )
  },
  {
    name: 'rank_trips_by_expense',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description:
      'Xếp hạng chuyến theo tổng chi phí (expenses.amount). Dùng khi hỏi chuyến tốn nhiều tiền/chi phí nhất. Không cần pipeline.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'integer', description: 'Số chuyến trả về (mặc định 10)' },
        approvedOnly: {
          type: 'boolean',
          description: 'true = chỉ cộng expense đã duyệt (mặc định true)'
        }
      }
    },
    execute: async (args) => {
      const limit = Math.min(Math.max(1, Number(args.limit) || 10), 30)
      const approvedOnly = args.approvedOnly !== false
      const rows = await GET_DB()
        .collection(tripModel.TRIP_COLLECTION_NAME)
        .aggregate([
          { $match: { _destroy: false } },
          {
            $addFields: {
              expenseTotal: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: { $ifNull: ['$expenses', []] },
                        as: 'e',
                        cond: approvedOnly
                          ? { $eq: ['$$e.status', 'approved'] }
                          : true
                      }
                    },
                    as: 'e',
                    in: { $ifNull: ['$$e.amount', 0] }
                  }
                }
              },
              expenseCount: {
                $size: {
                  $filter: {
                    input: { $ifNull: ['$expenses', []] },
                    as: 'e',
                    cond: approvedOnly
                      ? { $eq: ['$$e.status', 'approved'] }
                      : true
                  }
                }
              },
              advanceTotal: {
                $sum: {
                  $map: {
                    input: { $ifNull: ['$advances', []] },
                    as: 'a',
                    in: { $ifNull: ['$$a.amount', 0] }
                  }
                }
              }
            }
          },
          { $sort: { expenseTotal: -1 } },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              code: 1,
              title: 1,
              status: 1,
              region: 1,
              startDate: 1,
              endDate: 1,
              expenseTotal: 1,
              expenseCount: 1,
              advanceTotal: 1
            }
          }
        ])
        .toArray()

      const items = rows.map((row) => ({
        id: row._id.toString(),
        code: row.code,
        title: row.title || '',
        status: row.status,
        region: row.region || '',
        startDate: row.startDate,
        endDate: row.endDate,
        expenseTotal: row.expenseTotal || 0,
        expenseCount: row.expenseCount || 0,
        advanceTotal: row.advanceTotal || 0
      }))
      const top = items[0] || null
      return {
        approvedOnly,
        topTrip: top
          ? {
              ...top,
              note: `${top.code}${top.title ? ` — ${top.title}` : ''} tốn nhiều chi phí nhất: ${Number(top.expenseTotal).toLocaleString('vi-VN')} ₫ (${top.expenseCount} khoản).`
            }
          : null,
        rankingNote: top
          ? `Chuyến chi phí cao nhất: ${top.code} = ${Number(top.expenseTotal).toLocaleString('vi-VN')} ₫`
          : 'Chưa có chuyến nào có chi phí.',
        items
      }
    }
  },
  {
    name: 'get_trip',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description:
      'Chi tiết chuyến theo id Mongo hoặc mã chuyến (CT-…). Có advances, expenses, settlementPreview, stops, orders.',
    parameters: {
      type: 'object',
      properties: {
        tripId: {
          type: 'string',
          description: 'Mongo _id hoặc mã chuyến (code), ví dụ CT-20260804-002'
        }
      },
      required: ['tripId']
    },
    execute: async (args, userCtx) => resolveTrip(args.tripId, userCtx)
  },
  {
    name: 'suggest_trip_advance',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description:
      'Đề xuất số tiền tạm ứng cho chuyến (theo mã CT-… hoặc id). BẮT BUỘC dùng khi user hỏi cần tạm ứng / ứng bao nhiêu / đề xuất ứng. Trả sẵn số đề xuất + đã ứng + chi phí — không hỏi lại "có muốn xem chi tiết không".',
    parameters: {
      type: 'object',
      properties: {
        tripId: {
          type: 'string',
          description: 'Mongo _id hoặc mã chuyến (code), ví dụ CT-20260804-002'
        }
      },
      required: ['tripId']
    },
    execute: async (args, userCtx) => {
      const trip = await resolveTrip(args.tripId, userCtx)
      const preview = trip.settlementPreview || {
        advanceTotal: 0,
        expenseAdvanceTotal: 0,
        expenseReimburseTotal: 0,
        employeeReturn: 0,
        companyPay: 0,
        advanceTopUp: 0
      }

      const advances = Array.isArray(trip.advances) ? trip.advances : []
      const expenses = Array.isArray(trip.expenses) ? trip.expenses : []
      const stops = Array.isArray(trip.stops) ? trip.stops : []
      const members = Array.isArray(trip.members) ? trip.members : []

      const advanceTotal = Number(preview.advanceTotal) || 0
      const approvedAdvanceSpend = Number(preview.expenseAdvanceTotal) || 0
      const pendingAdvanceSpend = expenses
        .filter(
          (item) =>
            item.status === tripModel.EXPENSE_STATUS.PENDING &&
            item.funding === tripModel.EXPENSE_FUNDING.ADVANCE
        )
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
      const committedAdvanceSpend = approvedAdvanceSpend + pendingAdvanceSpend
      const shortfall = Math.max(0, committedAdvanceSpend - advanceTotal)
      const remainingAdvance = Math.max(0, advanceTotal - committedAdvanceSpend)

      const start = trip.startDate ? new Date(trip.startDate) : null
      const end = trip.endDate ? new Date(trip.endDate) : null
      let dayCount = 1
      if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        const ms = end.getTime() - start.getTime()
        dayCount = Math.max(1, Math.floor(ms / 86400000) + 1)
      }

      const stopCount = stops.length
      const memberCount = members.length || (trip.memberIds || []).length || 1

      // Ước lượng khi chưa có chi phí: ~300k/điểm dừng hoặc ~200k/người/ngày
      const ESTIMATE_PER_STOP = 300000
      const ESTIMATE_PER_MEMBER_DAY = 200000
      const coldEstimate = Math.max(
        stopCount * ESTIMATE_PER_STOP,
        memberCount * dayCount * ESTIMATE_PER_MEMBER_DAY
      )

      const closed =
        trip.status === tripModel.TRIP_STATUS.CLOSED ||
        trip.status === tripModel.TRIP_STATUS.CANCELLED

      const rationale = []
      let suggestedAdditional = 0
      let suggestedTotalAdvance = advanceTotal

      if (closed) {
        rationale.push(
          'Chuyến đã khóa/hủy — không đề xuất tạm ứng thêm; dùng số liệu quyết toán hiện có.'
        )
        suggestedAdditional = 0
        suggestedTotalAdvance = advanceTotal
      } else if (shortfall > 0) {
        suggestedAdditional = shortfall
        suggestedTotalAdvance = advanceTotal + shortfall
        rationale.push(
          `Chi phí trừ ứng (đã duyệt + chờ duyệt) ${committedAdvanceSpend.toLocaleString('vi-VN')} ₫ vượt quỹ ứng ${advanceTotal.toLocaleString('vi-VN')} ₫ → cần bù ${shortfall.toLocaleString('vi-VN')} ₫.`
        )
      } else if (advanceTotal === 0 && committedAdvanceSpend === 0) {
        suggestedAdditional = coldEstimate
        suggestedTotalAdvance = coldEstimate
        rationale.push(
          `Chưa có tạm ứng/chi phí ghi nhận. Ước lượng khởi điểm theo ${stopCount} điểm dừng × ${ESTIMATE_PER_STOP.toLocaleString('vi-VN')} ₫ hoặc ${memberCount} người × ${dayCount} ngày × ${ESTIMATE_PER_MEMBER_DAY.toLocaleString('vi-VN')} ₫ → lấy mức cao hơn.`
        )
        rationale.push(
          'Đây là ước lượng tham khảo — điều chỉnh theo thực tế xăng/ăn/nghỉ của chuyến.'
        )
      } else {
        suggestedAdditional = 0
        suggestedTotalAdvance = advanceTotal
        rationale.push(
          `Quỹ ứng còn dư ${remainingAdvance.toLocaleString('vi-VN')} ₫ sau chi phí trừ ứng đã/đang ghi nhận — chưa cần ứng thêm nếu không phát sinh mới.`
        )
        if (trip.status === tripModel.TRIP_STATUS.IN_PROGRESS && stopCount > 0) {
          rationale.push(
            'Chuyến đang diễn ra: nếu còn điểm dừng/chi phí dự kiến, có thể ứng thêm theo thực tế.'
          )
        }
      }

      return {
        tripId: trip.id || trip._id?.toString?.() || null,
        code: trip.code,
        status: trip.status,
        region: trip.region || trip.title || '',
        startDate: trip.startDate || null,
        endDate: trip.endDate || null,
        dayCount,
        memberCount,
        stopCount,
        orderCount: Array.isArray(trip.orders) ? trip.orders.length : 0,
        advanceTotal,
        approvedAdvanceSpend,
        pendingAdvanceSpend,
        committedAdvanceSpend,
        remainingAdvance,
        shortfall,
        expenseReimburseTotal: Number(preview.expenseReimburseTotal) || 0,
        suggestedAdditional,
        suggestedTotalAdvance,
        currency: 'VND',
        closed,
        rationale,
        answerHint:
          closed
            ? `Chuyến ${trip.code} đã ${trip.status}. Đã ứng ${advanceTotal.toLocaleString('vi-VN')} ₫.`
            : suggestedAdditional > 0
              ? `Đề xuất tạm ứng thêm ${suggestedAdditional.toLocaleString('vi-VN')} ₫ (tổng quỹ ứng mục tiêu ${suggestedTotalAdvance.toLocaleString('vi-VN')} ₫). Hiện đã ứng ${advanceTotal.toLocaleString('vi-VN')} ₫.`
              : `Chuyến ${trip.code} đã ứng ${advanceTotal.toLocaleString('vi-VN')} ₫, còn dư khoảng ${remainingAdvance.toLocaleString('vi-VN')} ₫ — chưa cần ứng thêm.`
      }
    }
  },
  {
    name: 'get_inventory_stocks',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description: 'Xem tồn kho theo kho / tìm sản phẩm.',
    parameters: {
      type: 'object',
      properties: {
        warehouseId: { type: 'string' },
        search: { type: 'string' },
        page: { type: 'integer' },
        limit: { type: 'integer' }
      }
    },
    execute: async (args) =>
      truncateList(
        await inventoryService.getStocks({ ...args, limit: args.limit || 10 })
      )
  },
  {
    name: 'get_low_stock',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description:
      'Tồn kho thấp (quantity ≤ threshold, mặc định 20). Dùng khi hỏi sắp hết hàng / tồn thấp.',
    parameters: {
      type: 'object',
      properties: {
        threshold: {
          type: 'integer',
          description: 'Ngưỡng chai (mặc định 20)'
        },
        warehouseId: { type: 'string' },
        search: { type: 'string' },
        limit: { type: 'integer' }
      }
    },
    execute: async (args) => {
      const threshold =
        Number.isFinite(Number(args.threshold)) && Number(args.threshold) >= 0
          ? Number(args.threshold)
          : 20
      const result = await inventoryService.getStocks({
        warehouseId: args.warehouseId,
        search: args.search,
        limit: 100,
        page: 1
      })
      const items = (result.items || [])
        .filter((item) => (Number(item.quantity) || 0) <= threshold)
        .sort((a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0))
        .slice(0, Math.min(Number(args.limit) || 15, 30))
        .map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          warehouseId: item.warehouseId,
          warehouseName: item.warehouseName,
          quantity: item.quantity,
          unitsPerCase: item.unitsPerCase,
          stockValue: item.stockValue
        }))
      return {
        threshold,
        total: items.length,
        emptyNote: items.length === 0,
        rankingNote: items.length
          ? `Tồn thấp nhất: ${items[0].productName} — ${items[0].quantity} chai (${items[0].warehouseName || 'kho'}).`
          : `Không có dòng tồn ≤ ${threshold} chai.`,
        items
      }
    }
  },
  {
    name: 'get_inventory_transactions',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description: 'Lịch sử phiếu nhập/xuất kho.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'import|export' },
        warehouseId: { type: 'string' },
        productId: { type: 'string' },
        page: { type: 'integer' },
        limit: { type: 'integer' }
      }
    },
    execute: async (args) =>
      truncateList(
        await inventoryService.getTransactions({
          ...args,
          limit: args.limit || 15
        })
      )
  },
  {
    name: 'get_inventory_flow',
    kind: 'read',
    requiredRoles: WH_ACC,
    description:
      'Báo cáo dòng vốn kho theo kỳ (nhập/xuất tiền, top vốn, hàng chậm). Mặc định tháng hiện tại.',
    parameters: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'YYYY-MM-DD' },
        to: { type: 'string', description: 'YYYY-MM-DD' },
        warehouseId: { type: 'string' }
      }
    },
    execute: async (args, userCtx) => {
      const data = await inventoryService.getFlowReport(args)
      return canViewProfit(userCtx) ? data : stripProfit(data)
    }
  },
  {
    name: 'get_stock_valuation',
    kind: 'read',
    requiredRoles: WH_ACC,
    description: 'Tổng vốn tồn kho hiện tại (theo giá vốn SP).',
    parameters: {
      type: 'object',
      properties: {
        warehouseId: { type: 'string' }
      }
    },
    execute: async (args) => inventoryService.getStockValuation(args)
  },
  {
    name: 'get_receivables_summary',
    kind: 'read',
    requiredRoles: SALES_ACC,
    description:
      'Công nợ đại lý từ DB: tổng nợ + danh sách sắp xếp debtAmount giảm dần. topDebtor = đại lý nợ nhiều nhất. Dùng khi hỏi ai nợ nhiều, còn nợ bao nhiêu.',
    parameters: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Lọc theo tên/SĐT/khu vực đại lý. Bỏ trống để lấy toàn bộ.'
        }
      }
    },
    execute: async (args) => {
      const summary = await receivablesService.getSummary(args)
      const items = (summary.items || []).slice(0, 10).map((item) => ({
        dealerId: item.dealerId,
        dealerName: item.dealerName,
        region: item.region,
        phone: item.phone,
        debtAmount: item.debtAmount,
        debtOrderCount: item.debtOrderCount,
        paidAmount: item.paidAmount,
        orderTotal: item.orderTotal
      }))
      const top = items[0] || null
      return {
        totals: summary.totals,
        topDebtor: top
          ? {
              dealerName: top.dealerName,
              dealerId: top.dealerId,
              debtAmount: top.debtAmount,
              debtOrderCount: top.debtOrderCount,
              region: top.region
            }
          : null,
        rankingNote: top
          ? `Đại lý nợ nhiều nhất: ${top.dealerName} — ${Number(top.debtAmount).toLocaleString('vi-VN')} ₫ (${top.debtOrderCount} đơn). items đã sort debtAmount giảm dần.`
          : 'Không có đại lý nào còn nợ trong hệ thống.',
        items
      }
    }
  },
  {
    name: 'get_payables_summary',
    kind: 'read',
    requiredRoles: WH_ACC,
    description:
      'Công nợ nhà cung cấp (AP): tổng nợ + danh sách debtAmount giảm dần. topCreditor = NCC nợ nhiều nhất. Dùng khi hỏi nợ NCC, còn phải trả bao nhiêu.',
    parameters: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Lọc theo tên/SĐT/MST NCC. Bỏ trống = toàn bộ.'
        }
      }
    },
    execute: async (args) => {
      const summary = await payablesService.getSummary(args)
      const items = (summary.items || []).slice(0, 10).map((item) => ({
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        phone: item.phone,
        taxCode: item.taxCode,
        debtAmount: item.debtAmount,
        debtInvoiceCount: item.debtInvoiceCount,
        paidAmount: item.paidAmount,
        invoiceTotal: item.invoiceTotal
      }))
      const top = items[0] || null
      return {
        totals: summary.totals,
        topCreditor: top
          ? {
              supplierName: top.supplierName,
              supplierId: top.supplierId,
              debtAmount: top.debtAmount,
              debtInvoiceCount: top.debtInvoiceCount
            }
          : null,
        rankingNote: top
          ? `NCC nợ nhiều nhất: ${top.supplierName} — ${Number(top.debtAmount).toLocaleString('vi-VN')} ₫ (${top.debtInvoiceCount} phiếu).`
          : 'Không có công nợ NCC trong hệ thống.',
        items
      }
    }
  },
  {
    name: 'search_suppliers',
    kind: 'read',
    requiredRoles: WH_ACC,
    description: 'Tìm nhà cung cấp theo tên/SĐT/MST/trạng thái.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        status: { type: 'string', description: 'active|inactive' },
        page: { type: 'integer' },
        limit: { type: 'integer' }
      }
    },
    execute: async (args) =>
      truncateList(
        await supplierService.getList({ ...args, limit: args.limit || 10 })
      )
  },
  {
    name: 'get_supplier',
    kind: 'read',
    requiredRoles: WH_ACC,
    description: 'Chi tiết nhà cung cấp theo id.',
    parameters: {
      type: 'object',
      properties: { supplierId: { type: 'string' } },
      required: ['supplierId']
    },
    execute: async (args) => supplierService.getDetails(args.supplierId)
  },
  {
    name: 'search_purchases',
    kind: 'read',
    requiredRoles: WH_ACC,
    description:
      'Danh sách phiếu nhập mua / công nợ NCC. hasDebt=true để chỉ phiếu còn nợ.',
    parameters: {
      type: 'object',
      properties: {
        supplierId: { type: 'string' },
        paymentStatus: {
          type: 'string',
          description: 'unpaid|partial|paid'
        },
        hasDebt: { type: 'boolean' },
        page: { type: 'integer' },
        limit: { type: 'integer' }
      }
    },
    execute: async (args) =>
      truncateList(
        await purchaseService.getList({
          ...args,
          hasDebt: args.hasDebt === true || args.hasDebt === 'true',
          limit: args.limit || 10
        })
      )
  },
  {
    name: 'get_purchase',
    kind: 'read',
    requiredRoles: WH_ACC,
    description: 'Chi tiết phiếu mua theo id Mongo hoặc mã phiếu.',
    parameters: {
      type: 'object',
      properties: {
        invoiceId: {
          type: 'string',
          description: 'Mongo id hoặc mã phiếu mua'
        }
      },
      required: ['invoiceId']
    },
    execute: async (args) => resolvePurchase(args.invoiceId)
  },
  {
    name: 'get_dashboard_summary',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description: 'KPI tổng quan dashboard tháng hiện tại.',
    parameters: { type: 'object', properties: {} },
    execute: async (_args, userCtx) => {
      const data = await dashboardService.getSummary()
      return canViewProfit(userCtx) ? data : stripProfit(data)
    }
  },
  {
    name: 'get_sales_report',
    kind: 'read',
    requiredRoles: ['accountant'],
    description:
      'Báo cáo bán hàng theo kỳ. Ưu tiên year+month (vd tháng 7/2026 → year:2026,month:7). Hoặc from/to YYYY-MM-DD, hoặc preset thisMonth|lastMonth|…',
    parameters: {
      type: 'object',
      properties: {
        year: { type: 'integer', description: 'Năm, vd 2026' },
        month: { type: 'integer', description: 'Tháng 1–12' },
        preset: {
          type: 'string',
          description: 'today|thisWeek|thisMonth|lastMonth|thisQuarter|thisYear'
        },
        from: { type: 'string', description: 'YYYY-MM-DD' },
        to: { type: 'string', description: 'YYYY-MM-DD' }
      }
    },
    execute: async (args, userCtx) => {
      const query = {}
      if (args.year != null && args.month != null) {
        query.year = args.year
        query.month = args.month
      } else if (args.from && args.to) {
        query.from = args.from
        query.to = args.to
      } else if (args.preset) {
        query.preset = args.preset
      } else {
        query.preset = 'thisMonth'
      }

      const data = await dashboardService.getReports(query)
      const cleaned = canViewProfit(userCtx) ? data : stripProfit(data)
      const kpis = cleaned.kpis || {}
      const period = cleaned.period || {}
      const from = period.from ? new Date(period.from) : null
      const to = period.to ? new Date(period.to) : null
      let periodLabel = period.preset || 'custom'
      if (from && to) {
        const sameMonth =
          from.getFullYear() === to.getFullYear() &&
          from.getMonth() === to.getMonth()
        periodLabel = sameMonth
          ? `Tháng ${from.getMonth() + 1}/${from.getFullYear()}`
          : `${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}`
      }

      const orderCount = Number(kpis.orderCount) || 0
      return {
        periodLabel,
        period: {
          preset: period.preset,
          from: period.from,
          to: period.to
        },
        empty: orderCount === 0,
        emptyNote:
          orderCount === 0
            ? `Không có đơn hàng (không hủy) trong ${periodLabel}. Không lấy số liệu kỳ khác.`
            : undefined,
        definitions: {
          revenue: 'Tổng tiền đơn không hủy (theo ngày tạo)',
          orderCount: 'Số đơn không hủy',
          completedCount: 'Số đơn status=completed',
          completedRevenue: 'Doanh thu chỉ đơn completed'
        },
        kpis: {
          orderCount,
          revenue: Number(kpis.revenue) || 0,
          completedCount: Number(kpis.completedCount) || 0,
          completedRevenue: Number(kpis.completedRevenue) || 0,
          paidAmount: Number(kpis.paidAmount) || 0,
          debt: Number(kpis.debt) || 0,
          avgOrderValue: Number(kpis.avgOrderValue) || 0,
          revenueChangePercent: kpis.revenueChangePercent
        },
        statusBreakdown: cleaned.statusBreakdown || [],
        topDealers: (cleaned.topDealers || []).slice(0, 5),
        topProducts: (cleaned.topProducts || []).slice(0, 5)
      }
    }
  },
  {
    name: 'describe_crm_schema',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description:
      'Xem danh sách bảng CRM + field. collection=all hoặc tên bảng. Gọi trước query_crm nếu chưa rõ field.',
    parameters: {
      type: 'object',
      properties: {
        collection: { type: 'string', description: 'all hoặc tên collection' }
      }
    },
    execute: async (args) => describeCrmCollection(args.collection || 'all')
  },
  {
    name: 'query_crm',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description:
      'Tự viết lệnh đọc MongoDB CRM khi không có tool chuyên biệt (hoặc cần lọc/tổng hợp tùy ý). operation=find|count|aggregate. Ví dụ: tìm chuyến gắn đơn → collection=trips, filter={"orderIds":"<orderId>"}; đếm đơn tháng → count + preset=thisMonth. Gọi describe_crm_schema trước nếu chưa rõ field. limit ≤50.',
    parameters: {
      type: 'object',
      properties: {
        collection: {
          type: 'string',
          description: `Một trong: ${CRM_QUERY_COLLECTIONS.join(', ')}`
        },
        operation: {
          type: 'string',
          description: 'find | count | aggregate (mặc định find)'
        },
        filter: {
          type: 'object',
          description:
            'Mongo filter JSON. ObjectId dạng string 24 hex được hydrate. Ví dụ {"code":"O-20260806-001"} hoặc {"status":"active"}'
        },
        projection: {
          type: 'object',
          description: 'find projection'
        },
        sort: {
          type: 'object',
          description: 'find sort, vd {"baseSalary":-1} hoặc {"createdAt":-1}'
        },
        pipeline: {
          type: 'array',
          description:
            'Các stage aggregate SAU $match (không dùng $lookup/$out). Ví dụ [{"$group":{"_id":"$status","n":{"$sum":1}}}]'
        },
        preset: {
          type: 'string',
          description: 'today|thisWeek|lastWeek|thisMonth|lastMonth — gắn vào dateField'
        },
        dateField: {
          type: 'string',
          description: 'Field ngày cho preset (mặc định createdAt)'
        },
        limit: {
          type: 'integer',
          description: 'Số dòng tối đa (server ≤50)'
        }
      },
      required: ['collection']
    },
    execute: async (args) => runCrmQuery(args)
  },
  {
    name: 'search_employees',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description:
      'Danh sách/tìm nhân viên. Lương cao nhất: sortBy=baseSalary, status=active. Field lương: baseSalary (+ allowance).',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Tên / mã / SĐT' },
        status: {
          type: 'string',
          description: 'active | inactive — bỏ trống = active'
        },
        sortBy: {
          type: 'string',
          description: 'createdAt | baseSalary (mặc định createdAt)'
        },
        limit: {
          type: 'integer',
          description: 'Số dòng (tối đa 50)'
        }
      }
    },
    execute: async (args) => {
      const status = pickEnum(args.status, ['active', 'inactive']) || 'active'
      const sortBy =
        String(args.sortBy || '').trim() === 'baseSalary'
          ? 'baseSalary'
          : 'createdAt'
      const result = await runCrmQuery({
        collection: 'employees',
        operation: 'find',
        filter: {
          status,
          ...(args.search
            ? {
                $or: [
                  { fullName: { $regex: String(args.search), $options: 'i' } },
                  { code: { $regex: String(args.search), $options: 'i' } },
                  { phone: { $regex: String(args.search), $options: 'i' } }
                ]
              }
            : {})
        },
        projection: {
          code: 1,
          fullName: 1,
          phone: 1,
          title: 1,
          department: 1,
          baseSalary: 1,
          allowance: 1,
          commissionPercent: 1,
          status: 1
        },
        sort: { [sortBy]: -1 },
        limit: args.limit || 20
      })
      const top = result.items?.[0]
      return {
        ...result,
        topBySalary:
          sortBy === 'baseSalary' && top
            ? {
                code: top.code,
                fullName: top.fullName,
                baseSalary: top.baseSalary,
                allowance: top.allowance,
                note: `${top.fullName} có lương cơ bản (baseSalary) cao nhất trong kết quả.`
              }
            : null
      }
    }
  },
  {
    name: 'get_employee',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description: 'Chi tiết nhân viên theo id (lương, phụ cấp, hoa hồng, phòng ban).',
    parameters: {
      type: 'object',
      properties: { employeeId: { type: 'string' } },
      required: ['employeeId']
    },
    execute: async (args) => employeeService.getDetails(args.employeeId)
  },
  {
    name: 'search_warehouses',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description: 'Danh sách/tìm kho.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        status: { type: 'string' },
        limit: { type: 'integer' }
      }
    },
    execute: async (args) =>
      truncateList(
        await warehouseService.getList({
          search: args.search,
          status: pickEnum(args.status, ['active', 'inactive']),
          limit: args.limit || 20
        })
      )
  },
  {
    name: 'search_payroll',
    kind: 'read',
    requiredRoles: ['accountant'],
    description: 'Kỳ bảng lương (payroll_periods). Chi tiết lines[] có net/baseSalary.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'draft|locked' },
        limit: { type: 'integer' }
      }
    },
    execute: async (args, userCtx) =>
      truncateList(
        await payrollService.getList(
          {
            status: pickEnum(args.status, ['draft', 'locked']),
            limit: args.limit || 20
          },
          userCtx.userId,
          userCtx.roles
        )
      )
  },
  {
    name: 'get_payroll',
    kind: 'read',
    requiredRoles: ['accountant'],
    description: 'Chi tiết một kỳ lương (lines[]: net, baseSalary, commission, tripReimburse).',
    parameters: {
      type: 'object',
      properties: { payrollId: { type: 'string' } },
      required: ['payrollId']
    },
    execute: async (args, userCtx) =>
      payrollService.getDetails(args.payrollId, userCtx.userId, userCtx.roles)
  },
  {
    name: 'search_news',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description: 'Tin tức nội bộ.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        status: { type: 'string' },
        limit: { type: 'integer' }
      }
    },
    execute: async (args) =>
      truncateList(
        await newsService.getList({
          search: args.search,
          status: args.status,
          limit: args.limit || 20
        })
      )
  },
  {
    name: 'get_news',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description: 'Chi tiết tin tức nội bộ theo id.',
    parameters: {
      type: 'object',
      properties: { newsId: { type: 'string' } },
      required: ['newsId']
    },
    execute: async (args) => newsService.getDetails(args.newsId)
  },
  {
    name: 'get_order_audits',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description:
      'Nhật ký thay đổi đơn (status/payment/xuất kho). Truyền orderId hoặc mã O-…',
    parameters: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'Mongo id hoặc mã đơn'
        }
      },
      required: ['orderId']
    },
    execute: async (args) => {
      const order = await resolveOrder(args.orderId)
      const id = order.id || order._id
      const audits = await orderService.getAudits(id)
      return {
        orderId: id,
        code: order.code,
        items: Array.isArray(audits) ? audits.slice(0, 30) : audits
      }
    }
  },
  {
    name: 'search_product_categories',
    kind: 'read',
    requiredRoles: ALL_STAFF,
    description: 'Loại sản phẩm.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        limit: { type: 'integer' }
      }
    },
    execute: async (args) =>
      truncateList(
        await productCategoryService.getList({
          search: args.search,
          limit: args.limit || 50
        })
      )
  },

  // —— Write tools ——
  {
    name: 'update_order_status',
    kind: 'write',
    requiredRoles: ALL_STAFF,
    description:
      'Đổi trạng thái GIAO HÀNG của đơn (không dùng cho thu tiền). Map: giao xong/hoàn tất→completed, đang giao→delivering, hủy→cancelled. orderId = id hoặc mã O-.... Cần xác nhận UI.',
    parameters: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'Mongo id hoặc mã đơn (vd O-20260804-003)'
        },
        status: {
          type: 'string',
          description:
            'pending|confirmed|delivering|completed|cancelled (completed = giao xong). Không dùng cho thanh toán.'
        }
      },
      required: ['orderId', 'status']
    },
    prepareWrite: async (args, userCtx) => {
      const order = await resolveOrder(args.orderId)
      const id = order.id || order._id
      const nextStatus = pickEnum(args.status, ORDER_STATUS_VALUES)
      if (!nextStatus) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Thiếu/không hợp lệ trạng thái đích (pending|confirmed|delivering|completed|cancelled).'
        )
      }
      if (nextStatus === order.status) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Đơn ${order.code || id} đang ở "${labelOrderStatus(order.status)}" rồi. Hãy hỏi user muốn chuyển sang trạng thái nào khác (vd đang giao, hoàn tất, hủy).`
        )
      }
      return {
        preview: `Đổi trạng thái đơn ${order.code || id}: ${labelOrderStatus(order.status)} → ${labelOrderStatus(nextStatus)}`,
        execute: async () =>
          orderService.update(id, { status: nextStatus }, userCtx.userId)
      }
    }
  },
  {
    name: 'record_order_payment',
    kind: 'write',
    requiredRoles: SALES_ACC,
    description:
      'Ghi nhận thanh toán / thu tiền đơn (không đổi trạng thái giao hàng). Dùng khi user nói đã thu, thu đủ, đã thanh toán. Bỏ amount = thu hết phần còn lại. Cần xác nhận UI.',
    parameters: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'Mongo id hoặc mã đơn (vd O-20260804-003)'
        },
        amount: {
          type: 'number',
          minimum: 0,
          description:
            'Số tiền thu (>0). Không gửi field này khi user muốn thu đủ phần còn lại.'
        },
        note: { type: 'string' }
      },
      required: ['orderId']
    },
    prepareWrite: async (args, userCtx) => {
      const order = await resolveOrder(args.orderId)
      const id = order.id || order._id
      const total = Number(order.total || 0)
      const paid = Number(order.paidAmount || 0)
      const remaining = Math.max(
        0,
        Number(order.remainingAmount ?? total - paid)
      )
      let amount = Number(args.amount)
      if (!Number.isFinite(amount) || amount <= 0) {
        amount = remaining
      }
      if (remaining <= 0) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Đơn ${order.code || id} đã thu đủ rồi (payment: paid).`
        )
      }
      if (amount > remaining) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Số tiền thu (${amount.toLocaleString('vi-VN')} ₫) vượt phần còn lại ${remaining.toLocaleString('vi-VN')} ₫.`
        )
      }
      const payAll = amount === remaining
      return {
        preview: payAll
          ? `Thu đủ phần còn lại ${amount.toLocaleString('vi-VN')} ₫ cho đơn ${order.code || id} (đã thu ${paid.toLocaleString('vi-VN')} ₫ / tổng ${total.toLocaleString('vi-VN')} ₫)`
          : `Thu ${amount.toLocaleString('vi-VN')} ₫ cho đơn ${order.code || id} (đã thu ${paid.toLocaleString('vi-VN')} ₫ / tổng ${total.toLocaleString('vi-VN')} ₫)`,
        execute: async () =>
          orderService.recordPayment(
            id,
            { amount, note: args.note || '' },
            { actorUserId: userCtx.userId }
          )
      }
    }
  },
  {
    name: 'update_lead_status',
    kind: 'write',
    requiredRoles: SALES_WH,
    description: 'Đề xuất đổi trạng thái lead. Cần xác nhận UI.',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        status: {
          type: 'string',
          description: 'new|contacted|qualified|converted|closed'
        },
        note: { type: 'string' }
      },
      required: ['leadId', 'status']
    },
    prepareWrite: async (args) => {
      const lead = await leadService.getDetails(args.leadId)
      const nextStatus = pickEnum(args.status, LEAD_STATUS_VALUES)
      if (!nextStatus) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Thiếu/không hợp lệ status lead (new|contacted|qualified|converted|closed).'
        )
      }
      if (nextStatus === lead.status) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Lead đang ở "${labelLeadStatus(lead.status)}" rồi. Hãy hỏi trạng thái đích khác.`
        )
      }
      const payload = { status: nextStatus }
      if (args.note != null) payload.note = args.note
      return {
        preview: `Đổi lead ${lead.name || args.leadId}: ${labelLeadStatus(lead.status)} → ${labelLeadStatus(nextStatus)}`,
        execute: async () => leadService.update(args.leadId, payload)
      }
    }
  },
  {
    name: 'create_lead',
    kind: 'write',
    requiredRoles: SALES_WH,
    description: 'Đề xuất tạo lead mới. Cần xác nhận UI.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        company: { type: 'string' },
        region: { type: 'string' },
        message: { type: 'string' },
        type: { type: 'string', description: 'contact|dealer' }
      },
      required: ['name', 'phone']
    },
    prepareWrite: async (args) => ({
      preview: `Tạo lead: ${args.name} — ${args.phone}${args.company ? ` (${args.company})` : ''}`,
      execute: async () => leadService.createPublic(args)
    })
  },
  {
    name: 'create_dealer',
    kind: 'write',
    requiredRoles: SALES_WH,
    description: 'Đề xuất tạo đại lý mới. Cần xác nhận UI.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        contactName: { type: 'string' },
        email: { type: 'string' },
        address: { type: 'string' },
        region: { type: 'string' },
        tier: { type: 'string' },
        discountPercent: { type: 'number' },
        note: { type: 'string' }
      },
      required: ['name', 'phone']
    },
    prepareWrite: async (args, userCtx) => ({
      preview: `Tạo đại lý: ${args.name} — ${args.phone}${args.region ? ` · ${args.region}` : ''}`,
      execute: async () => dealerService.createNew(args, userCtx.userId)
    })
  },
  {
    name: 'create_product',
    kind: 'write',
    requiredRoles: ['admin'],
    description:
      'Tạo SP từ nhãn. Bắt buộc name, shortDescription, description (markdown từ nhãn), categoryId/Name, image. Giá không rõ=0. Cần xác nhận.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Tên thương mại trên bao bì' },
        categoryId: { type: 'string', description: 'Mongo id loại SP' },
        categoryName: {
          type: 'string',
          description: 'Tên loại để khớp nếu chưa có id (thuốc trừ sâu/bệnh/cỏ…)'
        },
        price: { type: 'number', description: 'Giá bán. Không rõ thì 0' },
        costPrice: { type: 'number' },
        sku: { type: 'string' },
        unit: {
          type: 'string',
          description: 'chai nếu dung dịch ml; gói nếu bột/WP gram'
        },
        unitsPerCase: { type: 'integer', description: 'Số chai/gói mỗi thùng' },
        packaging: {
          type: 'string',
          description: 'Quy cách trên nhãn, vd 100g, 250ml'
        },
        activeIngredient: {
          type: 'string',
          description: 'Hoạt chất + hàm lượng, vd Acetamiprid 25% + Imidacloprid 8%'
        },
        shortDescription: {
          type: 'string',
          description:
            'BẮT BUỘC. 1–2 câu ≤300 ký tự: tên, công dụng/đặc trị, hoạt chất, quy cách. Viết từ nhãn.'
        },
        description: {
          type: 'string',
          description:
            'BẮT BUỘC. Markdown tiếng Việt từ nhãn: ## Thông tin chung, ## Thành phần, ## Hướng dẫn sử dụng, ## Cảnh báo, ## Nhà SX & phân phối. Không bỏ trống, không bịa.'
        },
        image: { type: 'string', description: 'URL ảnh đã upload' }
      },
      required: ['name', 'shortDescription', 'description']
    },
    prepareWrite: async (args, userCtx) => {
      const name = String(args.name || '').trim()
      if (name.length < 2) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Thiếu tên sản phẩm đọc từ nhãn.')
      }

      const category = await resolveProductCategory(
        args.categoryId,
        args.categoryName
      )

      const existing = await productService.getList({
        search: name,
        limit: 8
      })
      const needle = name.toLowerCase()
      const skuNeedle = String(args.sku || '').trim().toLowerCase()
      const dup = (existing.items || []).find((item) => {
        if (String(item.name || '').trim().toLowerCase() === needle) return true
        if (
          skuNeedle &&
          String(item.sku || '').trim().toLowerCase() === skuNeedle
        ) {
          return true
        }
        return false
      })
      if (dup) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          `Đã có sản phẩm "${dup.name}"${dup.sku ? ` (SKU ${dup.sku})` : ''}. Không tạo trùng.`
        )
      }

      const price = Number(args.price)
      const costPrice = Number(args.costPrice)
      const unitsPerCase = Number(args.unitsPerCase)
      const image =
        String(args.image || userCtx.imageUrl || '').trim() || ''
      const shortDescription = String(args.shortDescription || '')
        .trim()
        .slice(0, 300)
      const description = String(args.description || '').trim()
      if (shortDescription.length < 20) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Thiếu mô tả ngắn. Đọc nhãn rồi điền shortDescription (tên, đặc trị, hoạt chất, quy cách).'
        )
      }
      if (description.length < 80) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Thiếu mô tả chi tiết. Điền description Markdown từ nhãn: thông tin chung, thành phần, hướng dẫn dùng, cảnh báo, nhà SX/phân phối.'
        )
      }

      const payload = {
        name,
        categoryId: String(category.id || category._id),
        price: Number.isFinite(price) && price >= 0 ? price : 0,
        costPrice: Number.isFinite(costPrice) && costPrice >= 0 ? costPrice : 0,
        sku: String(args.sku || '').trim(),
        unit: String(args.unit || 'chai').trim() || 'chai',
        unitsPerCase:
          Number.isInteger(unitsPerCase) && unitsPerCase >= 1
            ? unitsPerCase
            : 1,
        packaging: String(args.packaging || '').trim(),
        activeIngredient: String(args.activeIngredient || '').trim(),
        shortDescription,
        description,
        image,
        images: image ? [image] : []
      }

      const money = payload.price.toLocaleString('vi-VN')
      const priceNote = payload.price === 0 ? ' (chưa rõ giá)' : ''
      return {
        preview: [
          `Tạo sản phẩm: ${payload.name} · ${category.name} · ${money} ₫${priceNote}${payload.packaging ? ` · ${payload.packaging}` : ''}`,
          payload.activeIngredient
            ? `Hoạt chất: ${payload.activeIngredient}`
            : null,
          `Mô tả ngắn: ${payload.shortDescription}`,
          `Mô tả chi tiết: đã soạn ${payload.description.length} ký tự từ nhãn.`
        ]
          .filter(Boolean)
          .join('\n'),
        execute: async () => productService.createNew(payload, userCtx.userId)
      }
    }
  },
  {
    name: 'add_trip_expense',
    kind: 'write',
    requiredRoles: ALL_STAFF,
    description: 'Đề xuất thêm chi phí vào chuyến. Cần xác nhận UI.',
    parameters: {
      type: 'object',
      properties: {
        tripId: {
          type: 'string',
          description: 'Mongo id hoặc mã CT-…'
        },
        amount: { type: 'number', minimum: 1 },
        category: {
          type: 'string',
          description: 'fuel|food|lodging|toll|parking|other'
        },
        funding: {
          type: 'string',
          description: 'advance|reimburse (mặc định advance)'
        },
        note: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' }
      },
      required: ['tripId', 'amount', 'category']
    },
    prepareWrite: async (args, userCtx) => {
      const trip = await resolveTrip(args.tripId, userCtx)
      const amount = Number(args.amount)
      const category = pickEnum(args.category, EXPENSE_CATEGORY_VALUES)
      if (!category) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'category phải là fuel|food|lodging|toll|parking|other'
        )
      }
      const tripId = trip._id?.toString?.() || trip.id || args.tripId
      return {
        preview: `Thêm chi ${amount.toLocaleString('vi-VN')} ₫ (${category}) vào chuyến ${trip.code || tripId}`,
        execute: async () =>
          tripService.addExpense(
            tripId,
            {
              amount,
              category,
              funding: args.funding || 'advance',
              note: args.note || '',
              date: args.date || new Date().toISOString().slice(0, 10)
            },
            userCtx.userId,
            userCtx.roles
          )
      }
    }
  },
  {
    name: 'add_trip_advance',
    kind: 'write',
    requiredRoles: ALL_STAFF,
    description:
      'Đề xuất ghi tạm ứng cho chuyến (sau khi đã suggest_trip_advance nếu cần). Cần xác nhận UI.',
    parameters: {
      type: 'object',
      properties: {
        tripId: {
          type: 'string',
          description: 'Mongo id hoặc mã CT-…'
        },
        amount: { type: 'number', minimum: 1 },
        note: { type: 'string' }
      },
      required: ['tripId', 'amount']
    },
    prepareWrite: async (args, userCtx) => {
      const trip = await resolveTrip(args.tripId, userCtx)
      const amount = Number(args.amount)
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Số tiền ứng phải > 0')
      }
      const tripId = trip._id?.toString?.() || trip.id
      return {
        preview: `Ghi tạm ứng ${amount.toLocaleString('vi-VN')} ₫ cho chuyến ${trip.code || tripId}${args.note ? ` — ${args.note}` : ''}`,
        execute: async () =>
          tripService.addAdvance(
            tripId,
            { amount, note: args.note || '' },
            userCtx.userId
          )
      }
    }
  },
  {
    name: 'update_trip_status',
    kind: 'write',
    requiredRoles: ALL_STAFF,
    description:
      'Đổi trạng thái chuyến: draft|in_progress|settlement|cancelled. Khóa chuyến dùng settle_trip. Cần xác nhận UI.',
    parameters: {
      type: 'object',
      properties: {
        tripId: { type: 'string' },
        status: {
          type: 'string',
          description: 'draft|in_progress|settlement|cancelled'
        }
      },
      required: ['tripId', 'status']
    },
    prepareWrite: async (args, userCtx) => {
      const trip = await resolveTrip(args.tripId, userCtx)
      const next = pickEnum(args.status, TRIP_STATUS_VALUES)
      if (!next) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'status phải là draft|in_progress|settlement|cancelled (khóa = settle_trip)'
        )
      }
      if (next === trip.status) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Chuyến đang ở "${TRIP_STATUS_LABELS[trip.status] || trip.status}" rồi.`
        )
      }
      const tripId = trip._id?.toString?.() || trip.id
      return {
        preview: `Đổi chuyến ${trip.code || tripId}: ${TRIP_STATUS_LABELS[trip.status] || trip.status} → ${TRIP_STATUS_LABELS[next]}`,
        execute: async () =>
          tripService.update(
            tripId,
            { status: next },
            userCtx.userId,
            userCtx.roles
          )
      }
    }
  },
  {
    name: 'review_trip_expense',
    kind: 'write',
    requiredRoles: WH_ACC,
    description:
      'Duyệt hoặc từ chối khoản chi chuyến (approved|rejected). Cần xác nhận UI.',
    parameters: {
      type: 'object',
      properties: {
        tripId: { type: 'string' },
        expenseId: { type: 'string' },
        status: { type: 'string', description: 'approved|rejected' }
      },
      required: ['tripId', 'expenseId', 'status']
    },
    prepareWrite: async (args, userCtx) => {
      const trip = await resolveTrip(args.tripId, userCtx)
      const next = pickEnum(args.status, EXPENSE_REVIEW_VALUES)
      if (!next) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'status phải là approved|rejected'
        )
      }
      const tripId = trip._id?.toString?.() || trip.id
      const expense = (trip.expenses || []).find(
        (item) => item.id === args.expenseId
      )
      if (!expense) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy khoản chi trên chuyến.')
      }
      return {
        preview: `${next === 'approved' ? 'Duyệt' : 'Từ chối'} chi ${Number(expense.amount || 0).toLocaleString('vi-VN')} ₫ (${expense.category || ''}) trên chuyến ${trip.code || tripId}`,
        execute: async () =>
          tripService.reviewExpense(
            tripId,
            args.expenseId,
            { status: next },
            userCtx.userId
          )
      }
    }
  },
  {
    name: 'settle_trip',
    kind: 'write',
    requiredRoles: WH_ACC,
    description:
      'Quyết toán & khóa chuyến (cần duyệt hết chi phí pending). Cần xác nhận UI.',
    parameters: {
      type: 'object',
      properties: {
        tripId: { type: 'string' },
        note: { type: 'string' }
      },
      required: ['tripId']
    },
    prepareWrite: async (args, userCtx) => {
      const trip = await resolveTrip(args.tripId, userCtx)
      const tripId = trip._id?.toString?.() || trip.id
      const pending = (trip.expenses || []).filter(
        (item) => item.status === 'pending'
      ).length
      if (pending > 0) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          `Còn ${pending} khoản chi chưa duyệt — hãy review_trip_expense trước.`
        )
      }
      const preview = trip.settlementPreview || {}
      return {
        preview: `Quyết toán & khóa chuyến ${trip.code || tripId} (đã ứng ${(preview.advanceTotal || 0).toLocaleString('vi-VN')} ₫, chi trừ ứng ${(preview.expenseAdvanceTotal || 0).toLocaleString('vi-VN')} ₫)`,
        execute: async () =>
          tripService.settle(
            tripId,
            { note: args.note || '' },
            userCtx.userId
          )
      }
    }
  },
  {
    name: 'record_purchase_payment',
    kind: 'write',
    requiredRoles: WH_ACC,
    description:
      'Thanh toán công nợ phiếu mua NCC. Bỏ amount = trả hết phần còn lại. Cần xác nhận UI.',
    parameters: {
      type: 'object',
      properties: {
        invoiceId: {
          type: 'string',
          description: 'Mongo id hoặc mã phiếu'
        },
        amount: {
          type: 'number',
          description: 'Số tiền trả. Không gửi = trả hết remaining.'
        },
        note: { type: 'string' }
      },
      required: ['invoiceId']
    },
    prepareWrite: async (args) => {
      const invoice = await resolvePurchase(args.invoiceId)
      const id = invoice.id || invoice._id
      const remaining = Math.max(
        0,
        Number(
          invoice.remainingAmount ??
            (Number(invoice.total) || 0) - (Number(invoice.paidAmount) || 0)
        )
      )
      let amount = Number(args.amount)
      if (!Number.isFinite(amount) || amount <= 0) amount = remaining
      if (remaining <= 0) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Phiếu ${invoice.code || id} đã thanh toán đủ.`
        )
      }
      if (amount > remaining) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Số tiền vượt còn nợ ${remaining.toLocaleString('vi-VN')} ₫.`
        )
      }
      return {
        preview: `Trả ${amount.toLocaleString('vi-VN')} ₫ cho phiếu ${invoice.code || id} (NCC ${invoice.supplierName || ''})`,
        execute: async () =>
          purchaseService.recordPayment(id, {
            amount,
            note: args.note || ''
          })
      }
    }
  }
]

export const getToolsForRoles = (roles) =>
  CHAT_TOOLS.filter((tool) => hasAnyRole(roles, ...tool.requiredRoles))

export const toOpenAITools = (tools) =>
  tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: String(tool.description || '').slice(0, 180),
      parameters: tool.parameters || { type: 'object', properties: {} }
    }
  }))

export const findTool = (name) => CHAT_TOOLS.find((t) => t.name === name)

/**
 * Run a tool. Write tools create pending confirmation instead of mutating.
 */
export const runChatTool = async (name, rawArgs, userCtx) => {
  const tool = findTool(name)
  if (!tool) {
    return { ok: false, error: `Unknown tool: ${name}` }
  }
  if (!hasAnyRole(userCtx.roles, ...tool.requiredRoles)) {
    return { ok: false, error: 'Bạn không có quyền dùng chức năng này.' }
  }

  let args = rawArgs
  if (typeof rawArgs === 'string') {
    try {
      args = JSON.parse(rawArgs || '{}')
    } catch {
      args = {}
    }
  }

  try {
    if (tool.kind === 'write') {
      const prepared = await tool.prepareWrite(args, userCtx)
      const pending = createPendingAction({
        userId: userCtx.userId,
        toolName: tool.name,
        args,
        preview: prepared.preview,
        execute: prepared.execute
      })
      return {
        ok: true,
        pending: true,
        ...pending
      }
    }

    const data = await tool.execute(args, userCtx)
    return { ok: true, pending: false, data }
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'Tool failed'
    }
  }
}
