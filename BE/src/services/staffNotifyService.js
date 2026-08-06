/* eslint-disable no-console */
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { dealerModel } from '~/models/dealerModel'
import { productModel } from '~/models/productModel'
import { warehouseModel } from '~/models/warehouseModel'
import { orderModel } from '~/models/orderModel'
import { tripModel } from '~/models/tripModel'
import { leadModel } from '~/models/leadModel'
import { employeeModel } from '~/models/employeeModel'
import { userModel } from '~/models/userModel'
import { userNotificationModel } from '~/models/userNotificationModel'
import { webPushService } from '~/services/webPushService'
import { webPushCopy } from '~/services/webPushCopy'

const LOW_STOCK_THRESHOLD = 20
const { USER_ROLES } = userModel
const { NOTIFICATION_TYPES } = userNotificationModel

const fireAndForget = (promise) => {
  Promise.resolve(promise).catch((error) => {
    console.error('[staff-notify] error', error?.message || error)
  })
}

const uniqueIds = (ids = []) => [
  ...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))
]

const findUserIdsByRoles = async (roles = []) => {
  if (!roles.length) return []
  const users = await GET_DB()
    .collection(userModel.USER_COLLECTION_NAME)
    .find({
      _destroy: { $ne: true },
      $or: [{ roles: { $in: roles } }, { role: { $in: roles } }]
    })
    .project({ _id: 1 })
    .toArray()
  return users.map((item) => item._id.toString())
}

const findUserIdsByEmployeeIds = async (employeeIds = []) => {
  const ids = uniqueIds(employeeIds)
  if (!ids.length) return []
  const employees = await employeeModel.findMany(
    { _id: { $in: ids.map((id) => new ObjectId(id)) } },
    { limit: ids.length, skip: 0 }
  )
  return employees.items
    .map((item) => item.userId?.toString?.() || item.userId)
    .filter(Boolean)
}

/** Admin + kế toán + NV đi chuyến + người tạo */
const resolveTripAudienceUserIds = async (trip) => {
  const memberIds = (trip.memberIds || []).map((id) => String(id)).filter(Boolean)
  const [roleUserIds, memberUserIds] = await Promise.all([
    findUserIdsByRoles([USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT]),
    findUserIdsByEmployeeIds(memberIds)
  ])
  const createdBy = trip.createdBy?.toString?.() || trip.createdBy || null
  return uniqueIds([...roleUserIds, ...memberUserIds, createdBy])
}

/** NV đi + người tạo; kế toán / admin gắn thêm ở từng hook hoặc dispatch */
const resolveTripMemberUserIds = async (trip) => {
  const memberIds = (trip.memberIds || []).map((id) => String(id)).filter(Boolean)
  const memberUserIds = await findUserIdsByEmployeeIds(memberIds)
  const createdBy = trip.createdBy?.toString?.() || trip.createdBy || null
  return uniqueIds([...memberUserIds, createdBy])
}

/** Member + tạo + kế toán (tạm ứng / quyết toán) */
const resolveTripFinanceAudienceUserIds = async (trip) => {
  const [memberIds, accountantIds] = await Promise.all([
    resolveTripMemberUserIds(trip),
    findUserIdsByRoles([USER_ROLES.ACCOUNTANT])
  ])
  return uniqueIds([...memberIds, ...accountantIds])
}

/** Người tạo đơn + NV giao hàng; admin gắn thêm trong dispatch */
const getOrderDeliveryEmployeeIds = (order = {}) => {
  const ids = []
  if (Array.isArray(order.deliveryEmployeeIds)) {
    for (const id of order.deliveryEmployeeIds) {
      if (id) ids.push(String(id))
    }
  }
  if (order.deliveryEmployeeId) {
    ids.push(String(order.deliveryEmployeeId))
  }
  return uniqueIds(ids)
}

const resolveOrderAudienceUserIds = async (order) => {
  const deliveryUserIds = await findUserIdsByEmployeeIds(
    getOrderDeliveryEmployeeIds(order)
  )
  const createdBy = order.createdBy?.toString?.() || order.createdBy || null
  return uniqueIds([...deliveryUserIds, createdBy])
}

/** Đơn + kế toán (thanh toán / công nợ); admin gắn thêm trong dispatch */
const resolveOrderPaymentAudienceUserIds = async (order) => {
  const [baseIds, accountantIds] = await Promise.all([
    resolveOrderAudienceUserIds(order),
    findUserIdsByRoles([USER_ROLES.ACCOUNTANT])
  ])
  return uniqueIds([...baseIds, ...accountantIds])
}

const excludeUser = (userIds, excludeUserId) => {
  if (!excludeUserId) return userIds
  const skip = String(excludeUserId)
  return userIds.filter((id) => id !== skip)
}

const inferTypeFromCopy = (copy = {}, fallback = NOTIFICATION_TYPES.ORDER) => {
  const tag = String(copy.tag || '')
  const url = String(copy.url || '')
  if (tag.startsWith('trip') || url.startsWith('/trips')) return NOTIFICATION_TYPES.TRIP
  if (tag.startsWith('stock') || url.startsWith('/inventory')) return NOTIFICATION_TYPES.STOCK
  if (tag.startsWith('dealer') || url.startsWith('/dealers')) return NOTIFICATION_TYPES.DEALER
  if (tag.startsWith('lead') || url.startsWith('/leads')) {
    return tag.includes('dealer') ? NOTIFICATION_TYPES.DEALER_LEAD : NOTIFICATION_TYPES.LEAD
  }
  if (tag.startsWith('payment') || tag.includes('payment')) return NOTIFICATION_TYPES.PAYMENT
  if (tag.startsWith('order') || url.startsWith('/orders')) return NOTIFICATION_TYPES.ORDER
  return fallback
}

const entityFromCopy = (copy = {}) => {
  const url = String(copy.url || '')
  const match =
    url.match(/[?&](?:id|detail)=([^&]+)/) ||
    url.match(/\/(orders|trips|leads|dealers|inventory)\b/)
  if (url.includes('/trips')) {
    return { entityType: 'trip', entityId: match?.[1] || null }
  }
  if (url.includes('/orders')) {
    return { entityType: 'order', entityId: match?.[1] || null }
  }
  if (url.includes('/leads')) {
    return { entityType: 'lead', entityId: match?.[1] || null }
  }
  if (url.includes('/dealers')) {
    return { entityType: 'dealer', entityId: match?.[1] || null }
  }
  if (url.includes('/inventory')) {
    return { entityType: 'product', entityId: match?.[1] || null }
  }
  return { entityType: null, entityId: null }
}

/**
 * Ghi inbox per-user rồi gửi web push cùng audience.
 * Admin được gắn vào mọi thông báo trừ khi options.includeAdmins === false
 * (thông báo cá nhân kiểu "Bạn được gắn…").
 */
const dispatch = async (copy, userIds, options = {}) => {
  const includeAdmins = options.includeAdmins !== false
  const adminIds = includeAdmins
    ? await findUserIdsByRoles([USER_ROLES.ADMIN])
    : []
  let recipients = uniqueIds([...(userIds || []), ...adminIds])
  if (options.excludeUserId) {
    recipients = excludeUser(recipients, options.excludeUserId)
  }
  if (!copy || !recipients.length) return { written: 0, pushed: 0 }

  const type = options.type || inferTypeFromCopy(copy)
  const entity = entityFromCopy(copy)

  await userNotificationModel.createManyForUsers(recipients, {
    type,
    title: copy.title,
    body: copy.body || '',
    href: copy.url || '/dashboard',
    tag: copy.tag || '',
    entityType: options.entityType || entity.entityType,
    entityId: options.entityId || entity.entityId
  })

  await Promise.all(
    recipients.map((userId) =>
      webPushService.notifyUser(userId, {
        title: copy.title,
        body: copy.body,
        url: copy.url,
        tag: copy.tag
      })
    )
  )

  return { written: recipients.length, pushed: recipients.length }
}

const onOrderStatusChanged = async (previousStatus, order, excludeUserId = null) => {
  if (!previousStatus || previousStatus === order.status) return
  if (
    ![
      orderModel.ORDER_STATUS.CONFIRMED,
      orderModel.ORDER_STATUS.DELIVERING,
      orderModel.ORDER_STATUS.COMPLETED,
      orderModel.ORDER_STATUS.CANCELLED
    ].includes(order.status)
  ) {
    return
  }

  const userIds = excludeUser(
    await resolveOrderAudienceUserIds(order),
    excludeUserId
  )
  const copy = webPushCopy.orderStatus(order)
  await dispatch(copy, userIds, {
    type: NOTIFICATION_TYPES.ORDER,
    entityType: 'order',
    entityId: order.id || order._id?.toString?.() || null
  })

  if (
    order.status === orderModel.ORDER_STATUS.COMPLETED &&
    [orderModel.PAYMENT_STATUS.UNPAID, orderModel.PAYMENT_STATUS.PARTIAL].includes(
      order.paymentStatus
    )
  ) {
    const paymentUserIds = excludeUser(
      await resolveOrderPaymentAudienceUserIds(order),
      excludeUserId
    )
    const reminder = webPushCopy.paymentReminder(order)
    await dispatch(reminder, paymentUserIds, {
      type: NOTIFICATION_TYPES.PAYMENT,
      entityType: 'order',
      entityId: order.id || order._id?.toString?.() || null
    })
  }
}

const onPaymentUpdated = async (order, excludeUserId = null) => {
  const userIds = excludeUser(
    await resolveOrderPaymentAudienceUserIds(order),
    excludeUserId
  )
  const copy = webPushCopy.paymentUpdate(order)
  await dispatch(copy, userIds, {
    type: NOTIFICATION_TYPES.PAYMENT,
    entityType: 'order',
    entityId: order.id || order._id?.toString?.() || null
  })
}

const onDealerStatusChanged = async (previousStatus, dealer) => {
  const roleUserIds = await findUserIdsByRoles([
    USER_ROLES.ADMIN,
    USER_ROLES.ACCOUNTANT
  ])
  const createdBy = dealer.createdBy?.toString?.() || dealer.createdBy || null

  if (
    previousStatus === dealerModel.DEALER_STATUS.PENDING &&
    dealer.status === dealerModel.DEALER_STATUS.ACTIVE
  ) {
    const copy = webPushCopy.dealerApproved(dealer)
    await dispatch(copy, uniqueIds([...roleUserIds, createdBy]), {
      type: NOTIFICATION_TYPES.DEALER,
      entityType: 'dealer',
      entityId: dealer.id || dealer._id?.toString?.() || null
    })
  }

  if (
    dealer.status === dealerModel.DEALER_STATUS.PENDING &&
    previousStatus !== dealerModel.DEALER_STATUS.PENDING
  ) {
    const copy = webPushCopy.pendingDealer(dealer)
    await dispatch(copy, roleUserIds, {
      type: NOTIFICATION_TYPES.DEALER,
      entityType: 'dealer',
      entityId: dealer.id || dealer._id?.toString?.() || null
    })
  }
}

const onDealerCreated = async (dealer) => {
  if (dealer.status !== dealerModel.DEALER_STATUS.PENDING) return
  const userIds = await findUserIdsByRoles([USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT])
  const copy = webPushCopy.pendingDealer(dealer)
  await dispatch(copy, userIds, {
    type: NOTIFICATION_TYPES.DEALER,
    entityType: 'dealer',
    entityId: dealer.id || dealer._id?.toString?.() || null
  })
}

const onTripCreated = async (trip) => {
  const copy = webPushCopy.tripCreated(trip)
  const userIds = await resolveTripAudienceUserIds(trip)
  await dispatch(copy, userIds, {
    type: NOTIFICATION_TYPES.TRIP,
    entityType: 'trip',
    entityId: trip.id || trip._id?.toString?.() || null
  })
}

const onTripStarted = async (trip) => {
  const deliveryStops = (trip.stops || []).filter(
    (stop) => stop.purpose === tripModel.STOP_PURPOSE.DELIVERY || !stop.purpose
  )
  const copy = webPushCopy.tripStarted(trip, deliveryStops.length)
  const userIds = await resolveTripAudienceUserIds(trip)
  await dispatch(copy, userIds, {
    type: NOTIFICATION_TYPES.TRIP,
    entityType: 'trip',
    entityId: trip.id || trip._id?.toString?.() || null
  })
}

/** Chờ quyết toán → admin (qua dispatch) + kế toán */
const onTripAwaitingSettlement = async (trip, excludeUserId = null) => {
  const accountantIds = await findUserIdsByRoles([USER_ROLES.ACCOUNTANT])
  const userIds = excludeUser(accountantIds, excludeUserId)
  const preview = trip.settlementPreview || {}
  const copy = webPushCopy.tripAwaitingSettlement(trip, preview)
  await dispatch(copy, userIds, {
    type: NOTIFICATION_TYPES.TRIP,
    entityType: 'trip',
    entityId: trip.id || trip._id?.toString?.() || null
  })
}

const onTripAdvance = async (trip, advance = {}, excludeUserId = null) => {
  const copy = webPushCopy.tripAdvance(trip, advance)
  const userIds = excludeUser(
    await resolveTripFinanceAudienceUserIds(trip),
    excludeUserId
  )
  await dispatch(copy, userIds, {
    type: NOTIFICATION_TYPES.TRIP,
    entityType: 'trip',
    entityId: trip.id || trip._id?.toString?.() || null
  })
}

const onTripExpensePending = async (trip, expense = {}, excludeUserId = null) => {
  const accountantIds = await findUserIdsByRoles([USER_ROLES.ACCOUNTANT])
  const userIds = excludeUser(accountantIds, excludeUserId)
  const copy = webPushCopy.tripExpensePending(trip, expense)
  await dispatch(copy, userIds, {
    type: NOTIFICATION_TYPES.TRIP,
    entityType: 'trip',
    entityId: trip.id || trip._id?.toString?.() || null
  })
}

const onTripExpenseReviewed = async (
  trip,
  expense = {},
  status,
  excludeUserId = null
) => {
  const copy = webPushCopy.tripExpenseReviewed(trip, expense, status)
  let userIds = await resolveTripMemberUserIds(trip)
  const expenseCreatedBy =
    expense.createdBy?.toString?.() || expense.createdBy || null
  if (expenseCreatedBy) {
    userIds = uniqueIds([...userIds, expenseCreatedBy])
  }
  userIds = excludeUser(userIds, excludeUserId)
  await dispatch(copy, userIds, {
    type: NOTIFICATION_TYPES.TRIP,
    entityType: 'trip',
    entityId: trip.id || trip._id?.toString?.() || null
  })
}

const onTripSettled = async (trip, settlement = {}, excludeUserId = null) => {
  const copy = webPushCopy.tripSettled(trip, settlement)
  const userIds = excludeUser(
    await resolveTripFinanceAudienceUserIds(trip),
    excludeUserId
  )
  await dispatch(copy, userIds, {
    type: NOTIFICATION_TYPES.TRIP,
    entityType: 'trip',
    entityId: trip.id || trip._id?.toString?.() || null
  })
}

const onLeadCreated = async (lead) => {
  const userIds = await findUserIdsByRoles([USER_ROLES.ADMIN, USER_ROLES.SALES])
  const copy = webPushCopy.newLead(lead)
  const isDealerLead = lead.type === leadModel.LEAD_TYPE.DEALER
  await dispatch(copy, userIds, {
    type: isDealerLead ? NOTIFICATION_TYPES.DEALER_LEAD : NOTIFICATION_TYPES.LEAD,
    entityType: 'lead',
    entityId: lead.id || lead._id?.toString?.() || null
  })
}

const onOrderCreated = async (order, excludeUserId = null) => {
  if (order.status !== orderModel.ORDER_STATUS.PENDING) return
  const [baseIds, warehouseIds] = await Promise.all([
    resolveOrderAudienceUserIds(order),
    findUserIdsByRoles([USER_ROLES.WAREHOUSE])
  ])
  const userIds = excludeUser(
    uniqueIds([...baseIds, ...warehouseIds]),
    excludeUserId
  )
  const copy = webPushCopy.pendingOrder(order)
  await dispatch(copy, userIds, {
    type: NOTIFICATION_TYPES.ORDER,
    entityType: 'order',
    entityId: order.id || order._id?.toString?.() || null
  })
}

/** NV giao mới được gắn vào đơn — chỉ gửi cho chính NV đó (không broadcast admin). */
const onOrderDeliveryAssigned = async (
  order,
  newlyAssignedEmployeeIds = [],
  excludeUserId = null
) => {
  const employeeIds = uniqueIds(newlyAssignedEmployeeIds)
  if (!employeeIds.length) return
  const userIds = await findUserIdsByEmployeeIds(employeeIds)
  if (!userIds.length) return
  const copy = webPushCopy.orderDeliveryAssigned(order)
  await dispatch(copy, userIds, {
    type: NOTIFICATION_TYPES.ORDER,
    entityType: 'order',
    entityId: order.id || order._id?.toString?.() || null,
    includeAdmins: false,
    excludeUserId
  })
}

const onStockChanged = async ({
  productId,
  warehouseId,
  quantity,
  previousQuantity
}) => {
  if (typeof quantity !== 'number' || quantity > LOW_STOCK_THRESHOLD) return
  // Chỉ khi vừa vượt ngưỡng (trước > 20, sau ≤ 20)
  if (
    typeof previousQuantity === 'number' &&
    previousQuantity <= LOW_STOCK_THRESHOLD
  ) {
    return
  }

  const [product, warehouse, userIds] = await Promise.all([
    productModel.findOneById(productId),
    warehouseId ? warehouseModel.findOneById(warehouseId) : null,
    findUserIdsByRoles([USER_ROLES.WAREHOUSE, USER_ROLES.ACCOUNTANT])
  ])

  const copy = webPushCopy.lowStock({
    productName: product?.name || 'Sản phẩm',
    quantity,
    warehouseName: warehouse?.name || '',
    productId
  })
  await dispatch(copy, userIds, {
    type: NOTIFICATION_TYPES.STOCK,
    entityType: 'product',
    entityId: productId ? String(productId) : null
  })
}

export const staffNotifyService = {
  LOW_STOCK_THRESHOLD,
  fireAndForget,
  dispatch,
  onOrderStatusChanged: (prev, order, excludeUserId) =>
    fireAndForget(onOrderStatusChanged(prev, order, excludeUserId)),
  onPaymentUpdated: (order, excludeUserId) =>
    fireAndForget(onPaymentUpdated(order, excludeUserId)),
  onDealerStatusChanged: (prev, dealer) =>
    fireAndForget(onDealerStatusChanged(prev, dealer)),
  onDealerCreated: (dealer) => fireAndForget(onDealerCreated(dealer)),
  onTripCreated: (trip) => fireAndForget(onTripCreated(trip)),
  onTripStarted: (trip) => fireAndForget(onTripStarted(trip)),
  onTripAwaitingSettlement: (trip, excludeUserId) =>
    fireAndForget(onTripAwaitingSettlement(trip, excludeUserId)),
  onTripAdvance: (trip, advance, excludeUserId) =>
    fireAndForget(onTripAdvance(trip, advance, excludeUserId)),
  onTripExpensePending: (trip, expense, excludeUserId) =>
    fireAndForget(onTripExpensePending(trip, expense, excludeUserId)),
  onTripExpenseReviewed: (trip, expense, status, excludeUserId) =>
    fireAndForget(onTripExpenseReviewed(trip, expense, status, excludeUserId)),
  onTripSettled: (trip, settlement, excludeUserId) =>
    fireAndForget(onTripSettled(trip, settlement, excludeUserId)),
  onLeadCreated: (lead) => fireAndForget(onLeadCreated(lead)),
  onOrderCreated: (order, excludeUserId) =>
    fireAndForget(onOrderCreated(order, excludeUserId)),
  onOrderDeliveryAssigned: (order, newlyAssignedEmployeeIds, excludeUserId) =>
    fireAndForget(
      onOrderDeliveryAssigned(order, newlyAssignedEmployeeIds, excludeUserId)
    ),
  onStockChanged: (payload) => fireAndForget(onStockChanged(payload))
}
