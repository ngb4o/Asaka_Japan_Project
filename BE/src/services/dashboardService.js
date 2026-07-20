import { leadModel } from '~/models/leadModel'
import { dealerModel } from '~/models/dealerModel'
import { quoteModel } from '~/models/quoteModel'
import { orderModel } from '~/models/orderModel'
import { productModel } from '~/models/productModel'
import { warehouseStockModel } from '~/models/warehouseStockModel'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'
import { formatDocuments } from '~/utils/formatters'

const LOW_STOCK_THRESHOLD = 20

const getSummary = async () => {
  const [
    newLeads,
    totalLeads,
    activeDealers,
    totalDealers,
    draftQuotes,
    pendingOrders,
    completedOrders,
    totalProducts,
    revenueStats,
    recentLeads,
    recentOrders,
    lowStockItems
  ] = await Promise.all([
    leadModel.countByStatus(leadModel.LEAD_STATUS.NEW),
    GET_DB().collection(leadModel.LEAD_COLLECTION_NAME).countDocuments({ _destroy: false }),
    dealerModel.countByStatus(dealerModel.DEALER_STATUS.ACTIVE),
    GET_DB().collection(dealerModel.DEALER_COLLECTION_NAME).countDocuments({ _destroy: false }),
    quoteModel.countByStatus(quoteModel.QUOTE_STATUS.DRAFT),
    orderModel.countByStatus(orderModel.ORDER_STATUS.PENDING),
    orderModel.countByStatus(orderModel.ORDER_STATUS.COMPLETED),
    GET_DB().collection(productModel.PRODUCT_COLLECTION_NAME).countDocuments({ _destroy: false }),
    orderModel.sumCompletedTotal(),
    leadModel.findMany({}, { limit: 5, skip: 0 }),
    orderModel.findMany({}, { limit: 5, skip: 0 }),
    warehouseStockModel.findMany({}, { limit: 200, skip: 0 })
  ])

  const lowStock = lowStockItems.items
    .filter((item) => item.quantity <= LOW_STOCK_THRESHOLD)
    .slice(0, 5)

  const productIds = [
    ...new Set(lowStock.map((item) => item.productId.toString()))
  ]

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
      draftQuotes,
      pendingOrders,
      completedOrders,
      totalProducts,
      revenue: revenueStats.revenue,
      lowStockCount: lowStockItems.items.filter(
        (item) => item.quantity <= LOW_STOCK_THRESHOLD
      ).length
    },
    recentLeads: formatDocuments(recentLeads.items),
    recentOrders: formatDocuments(recentOrders.items).map((order) => ({
      id: order.id,
      code: order.code,
      customerName: order.customerName,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt
    })),
    lowStock: lowStock.map((item) => ({
      productId: item.productId.toString(),
      productName: productMap.get(item.productId.toString()) || '',
      quantity: item.quantity
    }))
  }
}

export const dashboardService = {
  getSummary
}
