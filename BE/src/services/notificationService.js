import { userNotificationModel } from '~/models/userNotificationModel'

const formatInboxItem = (doc) => {
  const id = doc._id?.toString?.() || String(doc._id)
  return {
    id,
    type: doc.type,
    title: doc.title,
    message: doc.body || '',
    href: doc.href || '/dashboard',
    createdAt: doc.createdAt,
    unread: !doc.readAt,
    tag: doc.tag || '',
    entityType: doc.entityType || null,
    entityId: doc.entityId || null
  }
}

const getList = async (userId) => {
  const [docs, unreadByType] = await Promise.all([
    userNotificationModel.findByUser(userId, { limit: 30 }),
    userNotificationModel.countUnreadByType(userId)
  ])

  const items = docs.map(formatInboxItem)
  const unreadCount = items.filter((item) => item.unread).length

  const counts = {
    leads:
      (unreadByType.lead || 0) + (unreadByType.dealer_lead || 0),
    dealers: unreadByType.dealer || 0,
    orders: (unreadByType.order || 0) + (unreadByType.payment || 0),
    stock: unreadByType.stock || 0,
    trips: unreadByType.trip || 0
  }

  return {
    unreadCount,
    counts,
    items
  }
}

const markAllRead = async (userId) => {
  const result = await userNotificationModel.markAllRead(userId)
  return {
    message: 'Đã đánh dấu tất cả thông báo là đã đọc',
    lastReadAt: result.lastReadAt
  }
}

const markOneRead = async (userId, notificationId) => {
  await userNotificationModel.markOneRead(userId, notificationId)
  return { message: 'Đã đánh dấu thông báo đã đọc' }
}

export const notificationService = {
  getList,
  markAllRead,
  markOneRead
}
