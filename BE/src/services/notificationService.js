import { leadModel } from '~/models/leadModel'
import { dealerModel } from '~/models/dealerModel'
import { orderModel } from '~/models/orderModel'
import { productModel } from '~/models/productModel'
import { warehouseModel } from '~/models/warehouseModel'
import { warehouseStockModel } from '~/models/warehouseStockModel'
import { userNotificationStateModel } from '~/models/userNotificationStateModel'
import { webPushCopy } from '~/services/webPushCopy'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'
import { formatDocuments } from '~/utils/formatters'

const LOW_STOCK_THRESHOLD = 20

const isUnread = (createdAt, lastReadAt) => {
  return new Date(createdAt).getTime() > new Date(lastReadAt).getTime()
}

const fromPush = (type, id, createdAt, copy) => ({
  id,
  type,
  title: copy.title,
  message: copy.body,
  href: copy.url,
  createdAt
})

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
  const warehouseIds = [
    ...new Set(lowStock.map((item) => item.warehouseId?.toString?.()).filter(Boolean))
  ]
  const dealerIds = [
    ...new Set(
      pendingOrders.items
        .map((item) => item.dealerId?.toString?.())
        .filter(Boolean)
    )
  ]

  let productMap = new Map()
  let warehouseMap = new Map()
  let dealerMap = new Map()

  await Promise.all([
    productIds.length
      ? GET_DB()
          .collection(productModel.PRODUCT_COLLECTION_NAME)
          .find({ _id: { $in: productIds.map((id) => new ObjectId(id)) } })
          .toArray()
          .then((products) => {
            productMap = new Map(
              products.map((item) => [item._id.toString(), item.name])
            )
          })
      : null,
    warehouseIds.length
      ? GET_DB()
          .collection(warehouseModel.WAREHOUSE_COLLECTION_NAME)
          .find({ _id: { $in: warehouseIds.map((id) => new ObjectId(id)) } })
          .toArray()
          .then((warehouses) => {
            warehouseMap = new Map(
              warehouses.map((item) => [item._id.toString(), item.name])
            )
          })
      : null,
    dealerIds.length
      ? GET_DB()
          .collection(dealerModel.DEALER_COLLECTION_NAME)
          .find({ _id: { $in: dealerIds.map((id) => new ObjectId(id)) } })
          .toArray()
          .then((dealers) => {
            dealerMap = new Map(
              dealers.map((item) => [item._id.toString(), item.name])
            )
          })
      : null
  ])

  const notifications = []

  for (const lead of formatDocuments(newLeads.items)) {
    const isDealerLead = lead.type === leadModel.LEAD_TYPE.DEALER
    const copy = webPushCopy.newLead(lead)
    notifications.push(
      fromPush(
        isDealerLead ? 'dealer_lead' : 'lead',
        `lead:${lead.id}`,
        lead.createdAt,
        copy
      )
    )
  }

  for (const dealer of formatDocuments(pendingDealers.items)) {
    const copy = webPushCopy.pendingDealer(dealer)
    notifications.push(
      fromPush('dealer', `dealer:${dealer.id}`, dealer.createdAt, copy)
    )
  }

  for (const order of formatDocuments(pendingOrders.items)) {
    const dealerId = order.dealerId || null
    const enriched = {
      ...order,
      dealerName: dealerId ? dealerMap.get(String(dealerId)) || '' : ''
    }
    const copy = webPushCopy.pendingOrder(enriched)
    notifications.push(
      fromPush('order', `order:${order.id}`, order.createdAt, copy)
    )
  }

  for (const stock of lowStock) {
    const productId = stock.productId.toString()
    const warehouseId = stock.warehouseId?.toString?.() || ''
    const createdAt = stock.updatedAt || new Date()
    const copy = webPushCopy.lowStock({
      productName: productMap.get(productId) || 'Sản phẩm',
      quantity: stock.quantity,
      warehouseName: warehouseMap.get(warehouseId) || 'Kho',
      productId
    })
    notifications.push(
      fromPush('stock', `stock:${productId}`, createdAt, copy)
    )
  }

  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return notifications
}

const getList = async (userId) => {
  const state = await userNotificationStateModel.getOrCreate(userId)
  const lastReadAt = state.lastReadAt || new Date(0)
  const readIds = new Set(Array.isArray(state.readIds) ? state.readIds : [])
  const items = await buildNotifications()

  const withReadState = items.map((item) => ({
    ...item,
    unread: isUnread(item.createdAt, lastReadAt) && !readIds.has(item.id)
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

const markOneRead = async (userId, notificationId) => {
  const result = await userNotificationStateModel.markOneRead(userId, notificationId)
  return { message: 'Đã đánh dấu thông báo đã đọc', readIds: result.readIds }
}

export const notificationService = {
  getList,
  markAllRead,
  markOneRead
}
