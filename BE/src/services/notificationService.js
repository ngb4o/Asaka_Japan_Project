import { leadModel } from '~/models/leadModel'
import { dealerModel } from '~/models/dealerModel'
import { orderModel } from '~/models/orderModel'
import { productModel } from '~/models/productModel'
import { warehouseStockModel } from '~/models/warehouseStockModel'
import { userNotificationStateModel } from '~/models/userNotificationStateModel'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'
import { formatDocuments } from '~/utils/formatters'

const LOW_STOCK_THRESHOLD = 20

const isUnread = (createdAt, lastReadAt) => {
  return new Date(createdAt).getTime() > new Date(lastReadAt).getTime()
}

const buildNotifications = async () => {
  const [newLeads, pendingDealers, pendingOrders, lowStockResult] = await Promise.all([
    leadModel.findMany(
      { status: leadModel.LEAD_STATUS.NEW },
      { limit: 20, skip: 0, sort: { createdAt: -1 } }
    ),
    dealerModel.findMany(
      { status: dealerModel.DEALER_STATUS.PENDING },
      { limit: 10, skip: 0, sort: { createdAt: -1 } }
    ),
    orderModel.findMany(
      { status: orderModel.ORDER_STATUS.PENDING },
      { limit: 10, skip: 0, sort: { createdAt: -1 } }
    ),
    warehouseStockModel.findMany({}, { limit: 200, skip: 0 })
  ])

  const lowStock = lowStockResult.items
    .filter((item) => item.quantity <= LOW_STOCK_THRESHOLD)
    .slice(0, 10)

  const productIds = [...new Set(lowStock.map((item) => item.productId.toString()))]

  let productMap = new Map()

  if (productIds.length) {
    const products = await GET_DB()
      .collection(productModel.PRODUCT_COLLECTION_NAME)
      .find({ _id: { $in: productIds.map((id) => new ObjectId(id)) } })
      .toArray()

    productMap = new Map(products.map((item) => [item._id.toString(), item.name]))
  }

  const notifications = []

  for (const lead of formatDocuments(newLeads.items)) {
    const isDealerLead = lead.type === leadModel.LEAD_TYPE.DEALER

    notifications.push({
      id: `lead:${lead.id}`,
      type: isDealerLead ? 'dealer_lead' : 'lead',
      title: isDealerLead ? 'Đăng ký đại lý mới' : 'Liên hệ mới',
      message: [lead.name, lead.phone].filter(Boolean).join('\n'),
      href: `/leads?id=${encodeURIComponent(lead.id)}`,
      createdAt: lead.createdAt
    })
  }

  for (const dealer of formatDocuments(pendingDealers.items)) {
    notifications.push({
      id: `dealer:${dealer.id}`,
      type: 'dealer',
      title: 'Đại lý chờ duyệt',
      message: [dealer.name, dealer.phone, dealer.region].filter(Boolean).join('\n'),
      href: `/dealers?id=${encodeURIComponent(dealer.id)}`,
      createdAt: dealer.createdAt
    })
  }

  for (const order of formatDocuments(pendingOrders.items)) {
    notifications.push({
      id: `order:${order.id}`,
      type: 'order',
      title: 'Đơn hàng chờ xử lý',
      message: [order.code, order.customerName, order.customerPhone]
        .filter(Boolean)
        .join('\n'),
      href: `/orders?detail=${encodeURIComponent(order.id)}`,
      createdAt: order.createdAt
    })
  }

  for (const stock of lowStock) {
    const productId = stock.productId.toString()
    const productName = productMap.get(productId) || 'Sản phẩm'
    const createdAt = stock.updatedAt || new Date()

    notifications.push({
      id: `stock:${productId}`,
      type: 'stock',
      title: 'Sắp hết hàng',
      message: [productName, `Còn ${stock.quantity}`].join('\n'),
      href: `/inventory?id=${encodeURIComponent(productId)}`,
      createdAt
    })
  }

  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return notifications
}

const getList = async (userId) => {
  const state = await userNotificationStateModel.getOrCreate(userId)
  const lastReadAt = state.lastReadAt || new Date(0)
  const items = await buildNotifications()

  const withReadState = items.map((item) => ({
    ...item,
    unread: isUnread(item.createdAt, lastReadAt)
  }))

  const unreadCount = withReadState.filter((item) => item.unread).length

  const counts = {
    leads: withReadState.filter(
      (item) => item.unread && (item.type === 'lead' || item.type === 'dealer_lead')
    ).length,
    dealers: withReadState.filter((item) => item.unread && item.type === 'dealer').length,
    orders: withReadState.filter((item) => item.unread && item.type === 'order').length,
    stock: withReadState.filter((item) => item.unread && item.type === 'stock').length
  }

  return {
    unreadCount,
    counts,
    items: withReadState.slice(0, 30)
  }
}

const markAllRead = async (userId) => {
  const result = await userNotificationStateModel.markAllRead(userId)
  return { message: 'Đã đánh dấu tất cả thông báo là đã đọc', lastReadAt: result.lastReadAt }
}

export const notificationService = {
  getList,
  markAllRead
}
