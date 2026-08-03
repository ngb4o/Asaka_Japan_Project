import { ObjectId } from 'mongodb'
import { orderModel } from '~/models/orderModel'
import { dealerModel } from '~/models/dealerModel'
import { employeeModel } from '~/models/employeeModel'
import { userModel } from '~/models/userModel'
import { productModel } from '~/models/productModel'
import { leadModel } from '~/models/leadModel'
import { warehouseStockModel } from '~/models/warehouseStockModel'
import { GET_DB } from '~/config/mongodb'
import { formatDocuments } from '~/utils/formatters'

const LOW_STOCK_THRESHOLD = 20
const ACTIVE_ORDER_STATUSES = [
  orderModel.ORDER_STATUS.PENDING,
  orderModel.ORDER_STATUS.CONFIRMED,
  orderModel.ORDER_STATUS.DELIVERING,
  orderModel.ORDER_STATUS.COMPLETED
]

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

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)

const addMonths = (date, months) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1)

const formatMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const formatMonthLabel = (date) =>
  `T${date.getMonth() + 1}/${date.getFullYear()}`

const formatDayKey = (date) => date.toISOString().slice(0, 10)

const parsePeriod = (query = {}) => {
  const now = new Date()
  let preset = String(query.preset || 'thisMonth')

  if (query.from && query.to) {
    return {
      from: startOfDay(new Date(query.from)),
      to: endOfDay(new Date(query.to)),
      preset: 'custom',
      groupBy: String(query.groupBy || 'day')
    }
  }

  let from
  let to = endOfDay(now)
  let groupBy = 'day'

  switch (preset) {
  case 'lastMonth': {
    const firstThisMonth = startOfMonth(now)
    from = startOfMonth(addMonths(firstThisMonth, -1))
    to = endOfDay(new Date(firstThisMonth.getTime() - 1))
    break
  }
  case 'last3Months':
    from = startOfMonth(addMonths(now, -2))
    groupBy = 'month'
    break
  case 'thisYear':
    from = new Date(now.getFullYear(), 0, 1)
    groupBy = 'month'
    break
  case 'last12Months':
    from = startOfMonth(addMonths(now, -11))
    groupBy = 'month'
    break
  case 'thisMonth':
  default:
    preset = 'thisMonth'
    from = startOfMonth(now)
    break
  }

  return { from, to, preset, groupBy: String(query.groupBy || groupBy) }
}

const ordersCollection = () => GET_DB().collection(orderModel.ORDER_COLLECTION_NAME)

const matchOrdersInRange = (from, to, extra = {}) => ({
  _destroy: false,
  createdAt: { $gte: from, $lte: to },
  ...extra
})

const getKpis = async (from, to) => {
  const [current, previousPeriod] = await Promise.all([
    ordersCollection()
      .aggregate([
        { $match: matchOrdersInRange(from, to, { status: { $ne: orderModel.ORDER_STATUS.CANCELLED } }) },
        {
          $group: {
            _id: null,
            orderCount: { $sum: 1 },
            revenue: { $sum: '$total' },
            paidAmount: { $sum: { $ifNull: ['$paidAmount', 0] } },
            costTotal: { $sum: { $ifNull: ['$costTotal', 0] } },
            grossProfit: { $sum: { $ifNull: ['$grossProfit', 0] } },
            completedCount: {
              $sum: {
                $cond: [{ $eq: ['$status', orderModel.ORDER_STATUS.COMPLETED] }, 1, 0]
              }
            },
            completedRevenue: {
              $sum: {
                $cond: [
                  { $eq: ['$status', orderModel.ORDER_STATUS.COMPLETED] },
                  '$total',
                  0
                ]
              }
            }
          }
        }
      ])
      .toArray(),
    (() => {
      const duration = to.getTime() - from.getTime()
      const prevTo = new Date(from.getTime() - 1)
      const prevFrom = new Date(prevTo.getTime() - duration)
      return ordersCollection()
        .aggregate([
          {
            $match: matchOrdersInRange(prevFrom, prevTo, {
              status: { $ne: orderModel.ORDER_STATUS.CANCELLED }
            })
          },
          {
            $group: {
              _id: null,
              revenue: { $sum: '$total' },
              orderCount: { $sum: 1 },
              paidAmount: { $sum: { $ifNull: ['$paidAmount', 0] } },
              grossProfit: { $sum: { $ifNull: ['$grossProfit', 0] } }
            }
          }
        ])
        .toArray()
    })()
  ])

  const cur = current[0] || {
    orderCount: 0,
    revenue: 0,
    paidAmount: 0,
    costTotal: 0,
    grossProfit: 0,
    completedCount: 0,
    completedRevenue: 0
  }
  const prev = previousPeriod[0] || {
    revenue: 0,
    orderCount: 0,
    paidAmount: 0,
    grossProfit: 0
  }
  const debt = Math.max(0, cur.revenue - cur.paidAmount)

  const pct = (nowVal, prevVal) => {
    if (!prevVal) return nowVal > 0 ? 100 : 0
    return Math.round(((nowVal - prevVal) / prevVal) * 1000) / 10
  }

  return {
    orderCount: cur.orderCount,
    revenue: cur.revenue,
    paidAmount: cur.paidAmount,
    debt,
    costTotal: cur.costTotal,
    grossProfit: cur.grossProfit,
    completedCount: cur.completedCount,
    completedRevenue: cur.completedRevenue,
    avgOrderValue: cur.orderCount ? Math.round(cur.revenue / cur.orderCount) : 0,
    revenueChangePercent: pct(cur.revenue, prev.revenue),
    orderChangePercent: pct(cur.orderCount, prev.orderCount),
    paidChangePercent: pct(cur.paidAmount, prev.paidAmount),
    grossProfitChangePercent: pct(cur.grossProfit, prev.grossProfit)
  }
}

const getRevenueSeries = async (from, to, groupBy = 'day') => {
  const dateFormat = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d'

  const rows = await ordersCollection()
    .aggregate([
      {
        $match: matchOrdersInRange(from, to, {
          status: { $ne: orderModel.ORDER_STATUS.CANCELLED }
        })
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          revenue: { $sum: '$total' },
          paidAmount: { $sum: { $ifNull: ['$paidAmount', 0] } },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
    .toArray()

  const map = new Map(rows.map((row) => [row._id, row]))
  const series = []

  if (groupBy === 'month') {
    let cursor = startOfMonth(from)
    const end = startOfMonth(to)
    while (cursor <= end) {
      const key = formatMonthKey(cursor)
      const row = map.get(key)
      series.push({
        key,
        label: formatMonthLabel(cursor),
        revenue: row?.revenue || 0,
        paidAmount: row?.paidAmount || 0,
        orderCount: row?.orderCount || 0
      })
      cursor = addMonths(cursor, 1)
    }
  } else {
    let cursor = startOfDay(from)
    const end = startOfDay(to)
    while (cursor <= end) {
      const key = formatDayKey(cursor)
      const row = map.get(key)
      series.push({
        key,
        label: `${String(cursor.getDate()).padStart(2, '0')}/${String(cursor.getMonth() + 1).padStart(2, '0')}`,
        revenue: row?.revenue || 0,
        paidAmount: row?.paidAmount || 0,
        orderCount: row?.orderCount || 0
      })
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
    }
  }

  return series
}

const getStatusBreakdown = async (from, to) => {
  const rows = await ordersCollection()
    .aggregate([
      { $match: matchOrdersInRange(from, to) },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      }
    ])
    .toArray()

  const statuses = Object.values(orderModel.ORDER_STATUS)
  return statuses.map((status) => {
    const row = rows.find((item) => item._id === status)
    return {
      status,
      count: row?.count || 0,
      revenue: row?.revenue || 0
    }
  })
}

const getPaymentBreakdown = async (from, to) => {
  const rows = await ordersCollection()
    .aggregate([
      {
        $match: matchOrdersInRange(from, to, {
          status: { $ne: orderModel.ORDER_STATUS.CANCELLED }
        })
      },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          total: { $sum: '$total' },
          paidAmount: { $sum: { $ifNull: ['$paidAmount', 0] } }
        }
      }
    ])
    .toArray()

  return Object.values(orderModel.PAYMENT_STATUS).map((status) => {
    const row = rows.find((item) => item._id === status)
    return {
      status,
      count: row?.count || 0,
      total: row?.total || 0,
      paidAmount: row?.paidAmount || 0
    }
  })
}

const getTopDealers = async (from, to, limit = 10) => {
  const rows = await ordersCollection()
    .aggregate([
      {
        $match: matchOrdersInRange(from, to, {
          status: { $in: ACTIVE_ORDER_STATUSES },
          dealerId: { $ne: null }
        })
      },
      {
        $group: {
          _id: '$dealerId',
          revenue: { $sum: '$total' },
          paidAmount: { $sum: { $ifNull: ['$paidAmount', 0] } },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: limit }
    ])
    .toArray()

  if (!rows.length) return []

  const dealers = await GET_DB()
    .collection(dealerModel.DEALER_COLLECTION_NAME)
    .find({ _id: { $in: rows.map((row) => row._id) } })
    .toArray()
  const dealerMap = new Map(dealers.map((item) => [item._id.toString(), item]))

  return rows.map((row) => {
    const dealer = dealerMap.get(row._id.toString())
    return {
      dealerId: row._id.toString(),
      dealerName: dealer?.name || 'Đại lý đã xóa',
      region: dealer?.region || '',
      revenue: row.revenue,
      paidAmount: row.paidAmount,
      orderCount: row.orderCount
    }
  })
}

const getTopProducts = async (from, to, limit = 10) => {
  const rows = await ordersCollection()
    .aggregate([
      {
        $match: matchOrdersInRange(from, to, {
          status: { $in: ACTIVE_ORDER_STATUSES }
        })
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.lineTotal' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: limit }
    ])
    .toArray()

  return rows.map((row) => ({
    productId: row._id?.toString?.() || '',
    productName: row.productName || 'Sản phẩm',
    quantity: row.quantity,
    revenue: row.revenue
  }))
}

const getTopStaff = async (from, to, limit = 10) => {
  const rows = await ordersCollection()
    .aggregate([
      {
        $match: matchOrdersInRange(from, to, {
          status: { $in: ACTIVE_ORDER_STATUSES }
        })
      },
      {
        $group: {
          _id: '$createdBy',
          revenue: { $sum: '$total' },
          paidAmount: { $sum: { $ifNull: ['$paidAmount', 0] } },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: limit }
    ])
    .toArray()

  if (!rows.length) return []

  const userIds = rows.map((row) => row._id)
  const [users, employees] = await Promise.all([
    GET_DB()
      .collection(userModel.USER_COLLECTION_NAME)
      .find({ _id: { $in: userIds } })
      .toArray(),
    GET_DB()
      .collection(employeeModel.EMPLOYEE_COLLECTION_NAME)
      .find({ userId: { $in: userIds }, _destroy: false })
      .toArray()
  ])

  const userMap = new Map(users.map((item) => [item._id.toString(), item]))
  const employeeMap = new Map(
    employees.map((item) => [item.userId.toString(), item])
  )

  return rows.map((row) => {
    const id = row._id.toString()
    const employee = employeeMap.get(id)
    const user = userMap.get(id)
    return {
      userId: id,
      staffName: employee?.fullName || user?.email || 'Nhân viên',
      employeeCode: employee?.code || '',
      revenue: row.revenue,
      paidAmount: row.paidAmount,
      orderCount: row.orderCount
    }
  })
}

const getSummary = async () => {
  const now = new Date()
  const thisMonthFrom = startOfMonth(now)
  const last6From = startOfMonth(addMonths(now, -5))

  const [
    newLeads,
    totalLeads,
    activeDealers,
    totalDealers,
    pendingOrders,
    completedOrders,
    totalProducts,
    revenueStats,
    recentLeads,
    recentOrders,
    lowStockItems,
    monthKpis,
    revenueSeries,
    statusBreakdown,
    paymentBreakdown
  ] = await Promise.all([
    leadModel.countByStatus(leadModel.LEAD_STATUS.NEW),
    GET_DB().collection(leadModel.LEAD_COLLECTION_NAME).countDocuments({ _destroy: false }),
    dealerModel.countByStatus(dealerModel.DEALER_STATUS.ACTIVE),
    GET_DB().collection(dealerModel.DEALER_COLLECTION_NAME).countDocuments({ _destroy: false }),
    orderModel.countByStatus(orderModel.ORDER_STATUS.PENDING),
    orderModel.countByStatus(orderModel.ORDER_STATUS.COMPLETED),
    GET_DB().collection(productModel.PRODUCT_COLLECTION_NAME).countDocuments({ _destroy: false }),
    orderModel.sumCompletedTotal(),
    leadModel.findMany({}, { limit: 5, skip: 0 }),
    orderModel.findMany({}, { limit: 5, skip: 0 }),
    warehouseStockModel.findMany({}, { limit: 200, skip: 0 }),
    getKpis(thisMonthFrom, endOfDay(now)),
    getRevenueSeries(last6From, endOfDay(now), 'month'),
    getStatusBreakdown(thisMonthFrom, endOfDay(now)),
    getPaymentBreakdown(thisMonthFrom, endOfDay(now))
  ])

  const lowStock = lowStockItems.items
    .filter((item) => item.quantity <= LOW_STOCK_THRESHOLD)
    .slice(0, 5)

  const productIds = [...new Set(lowStock.map((item) => item.productId.toString()))]
  let productMap = new Map()
  if (productIds.length) {
    const products = await GET_DB()
      .collection(productModel.PRODUCT_COLLECTION_NAME)
      .find({ _id: { $in: productIds.map((id) => new ObjectId(id)) } })
      .toArray()
    productMap = new Map(products.map((item) => [item._id.toString(), item.name]))
  }

  return {
    stats: {
      newLeads,
      totalLeads,
      activeDealers,
      totalDealers,
      pendingOrders,
      completedOrders,
      totalProducts,
      revenue: revenueStats.revenue,
      lowStockCount: lowStockItems.items.filter(
        (item) => item.quantity <= LOW_STOCK_THRESHOLD
      ).length,
      monthRevenue: monthKpis.revenue,
      monthPaid: monthKpis.paidAmount,
      monthDebt: monthKpis.debt,
      monthOrders: monthKpis.orderCount,
      revenueChangePercent: monthKpis.revenueChangePercent,
      orderChangePercent: monthKpis.orderChangePercent
    },
    revenueSeries,
    statusBreakdown,
    paymentBreakdown,
    recentLeads: formatDocuments(recentLeads.items),
    recentOrders: formatDocuments(recentOrders.items).map((order) => ({
      id: order.id,
      code: order.code,
      customerName: order.customerName,
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt
    })),
    lowStock: lowStock.map((item) => ({
      productId: item.productId.toString(),
      productName: productMap.get(item.productId.toString()) || '',
      quantity: item.quantity
    }))
  }
}

const getReports = async (query = {}) => {
  const period = parsePeriod(query)
  const { from, to, preset, groupBy } = period

  const [kpis, series, statusBreakdown, paymentBreakdown, topDealers, topProducts, topStaff] =
    await Promise.all([
      getKpis(from, to),
      getRevenueSeries(from, to, groupBy),
      getStatusBreakdown(from, to),
      getPaymentBreakdown(from, to),
      getTopDealers(from, to, 10),
      getTopProducts(from, to, 10),
      getTopStaff(from, to, 10)
    ])

  return {
    period: {
      preset,
      groupBy,
      from: from.toISOString(),
      to: to.toISOString()
    },
    kpis,
    series,
    statusBreakdown,
    paymentBreakdown,
    topDealers,
    topProducts,
    topStaff
  }
}

export const dashboardService = {
  getSummary,
  getReports
}
