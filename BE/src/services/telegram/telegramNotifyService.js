/* eslint-disable no-console */
import { env } from '~/config/environment'
import { telegramClient } from '~/services/telegram/telegramClient'
import { telegramTemplates } from '~/services/telegram/telegramTemplates'
import { telegramKeyboards } from '~/services/telegram/telegramKeyboards'
import { telegramActionMessageModel } from '~/models/telegramActionMessageModel'
import { telegramContactModel } from '~/models/telegramContactModel'
import { dealerModel } from '~/models/dealerModel'
import { productModel } from '~/models/productModel'
import { warehouseModel } from '~/models/warehouseModel'
import { orderModel } from '~/models/orderModel'
import { tripModel } from '~/models/tripModel'
import { leadModel } from '~/models/leadModel'
import { webPushService } from '~/services/webPushService'
import { webPushCopy } from '~/services/webPushCopy'

const LOW_STOCK_THRESHOLD = 20

const TRACK_KIND = {
  PENDING_ORDER: 'pending_order',
  ORDER_FLOW: 'order_flow',
  LEAD: 'lead',
  PENDING_DEALER: 'pending_dealer',
  PAYMENT_REMINDER: 'payment_reminder'
}

let indexesReady = false
const ensureTrackIndexes = async () => {
  if (indexesReady) return
  try {
    await telegramActionMessageModel.ensureIndexes()
    indexesReady = true
  } catch (error) {
    console.warn('[telegram] action message indexes', error?.message || error)
  }
}

const fireAndForget = (promise) => {
  Promise.resolve(promise).catch((error) => {
    console.error('[telegram] notify error', error?.message || error)
  })
}

const resolveStaffRecipientIds = async () => {
  const fromEnv = env.TELEGRAM_STAFF_CHAT_IDS || []
  const staffContacts = await telegramContactModel.findStaff()
  const fromDb = staffContacts.map((item) => item.chatId).filter(Boolean)

  return [...new Set([...fromEnv, ...fromDb])]
}

const messageRefsFromResults = (chatIds, results) => {
  const list = Array.isArray(results) ? results : []
  const refs = []

  chatIds.forEach((chatId, index) => {
    const result = list[index]
    if (result?.ok && result.data?.message_id != null) {
      refs.push({ chatId: String(chatId), messageId: result.data.message_id })
    }
  })

  return refs
}

const sendToChatIds = async (chatIds, text, { replyMarkup } = {}) => {
  if (!telegramClient.isEnabled()) return { skipped: true }

  const unique = [...new Set((chatIds || []).filter(Boolean).map(String))]
  if (!unique.length) return []

  return await Promise.all(
    unique.map((chatId) =>
      telegramClient.sendTextMessage(chatId, text, { replyMarkup })
    )
  )
}

/** Tất cả thông báo CRM → chỉ gửi nội bộ (staff). Đại lý/khách không cần cài bot. */
const notifyStaff = async (text, options = {}) => {
  // Web Push to subscribed CRM devices (independent of Telegram)
  fireAndForget(webPushService.notifyStaff(text, options))

  const ids = await resolveStaffRecipientIds()
  if (!ids.length) {
    console.warn('[telegram] no staff recipients configured')
    return { skipped: true, reason: 'no_staff' }
  }

  const results = await sendToChatIds(ids, text, options)

  if (options.track?.entityType && options.track?.entityId && options.track?.kind) {
    await ensureTrackIndexes()
    await telegramActionMessageModel.remember({
      entityType: options.track.entityType,
      entityId: options.track.entityId,
      kind: options.track.kind,
      messages: messageRefsFromResults(ids, results)
    })
  }

  return results
}

/** 1 — Order lifecycle → staff */
const onOrderStatusChanged = async (previousStatus, order) => {
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

  await notifyStaff(telegramTemplates.orderLifecycle(order), {
    replyMarkup: telegramKeyboards.orderActions(order),
    track: {
      entityType: 'order',
      entityId: order.id,
      kind: TRACK_KIND.ORDER_FLOW
    },
    push: webPushCopy.orderStatus(order)
  })

  if (
    order.status === orderModel.ORDER_STATUS.COMPLETED &&
    [orderModel.PAYMENT_STATUS.UNPAID, orderModel.PAYMENT_STATUS.PARTIAL].includes(
      order.paymentStatus
    )
  ) {
    await notifyStaff(telegramTemplates.paymentReminder(order), {
      replyMarkup: telegramKeyboards.markPaidFull(order.id),
      track: {
        entityType: 'order',
        entityId: order.id,
        kind: TRACK_KIND.PAYMENT_REMINDER
      },
      push: webPushCopy.paymentReminder(order)
    })
  }
}

/** 2 — Payment recorded → staff */
const onPaymentUpdated = async (order) => {
  await notifyStaff(telegramTemplates.paymentUpdate(order), {
    push: webPushCopy.paymentUpdate(order),
    track: { entityType: 'order', entityId: order.id, kind: 'payment_update' }
  })
}

/** 3 — Dealer approved / pending → staff */
const onDealerStatusChanged = async (previousStatus, dealer) => {
  if (
    previousStatus === dealerModel.DEALER_STATUS.PENDING &&
    dealer.status === dealerModel.DEALER_STATUS.ACTIVE
  ) {
    await notifyStaff(telegramTemplates.dealerApproved(dealer), {
      push: webPushCopy.dealerApproved(dealer),
      track: { entityType: 'dealer', entityId: dealer.id, kind: 'dealer_approved' }
    })
  }

  if (
    dealer.status === dealerModel.DEALER_STATUS.PENDING &&
    previousStatus !== dealerModel.DEALER_STATUS.PENDING
  ) {
    await notifyStaff(
      telegramTemplates.pendingQueueStaff({
        kind: 'dealer',
        title: 'Đại lý chờ duyệt',
        detail: [
          `🏪 ${dealer.name}`,
          dealer.contactName ? `👤 Liên hệ: ${dealer.contactName}` : null,
          dealer.phone ? `📞 SĐT: ${dealer.phone}` : null,
          dealer.region ? `🗺️ Khu vực: ${dealer.region}` : null,
          dealer.tier ? `🏅 Hạng: ${dealer.tier}` : null
        ]
          .filter(Boolean)
          .join('\n')
      }),
      {
        replyMarkup: telegramKeyboards.approveDealer(dealer.id),
        track: {
          entityType: 'dealer',
          entityId: dealer.id,
          kind: TRACK_KIND.PENDING_DEALER
        },
        push: webPushCopy.pendingDealer(dealer)
      }
    )
  }
}

const onDealerCreated = async (dealer) => {
  if (dealer.status !== dealerModel.DEALER_STATUS.PENDING) return

  await notifyStaff(
    telegramTemplates.pendingQueueStaff({
      kind: 'dealer',
      title: 'Đại lý chờ duyệt',
      detail: [
        `🏪 ${dealer.name}`,
        dealer.contactName ? `👤 Liên hệ: ${dealer.contactName}` : null,
        dealer.phone ? `📞 SĐT: ${dealer.phone}` : null,
        dealer.region ? `🗺️ Khu vực: ${dealer.region}` : null,
        dealer.email ? `✉️ Email: ${dealer.email}` : null,
        dealer.address ? `📍 Địa chỉ: ${dealer.address}` : null
      ]
        .filter(Boolean)
        .join('\n')
    }),
    {
      replyMarkup: telegramKeyboards.approveDealer(dealer.id),
      track: {
        entityType: 'dealer',
        entityId: dealer.id,
        kind: TRACK_KIND.PENDING_DEALER
      },
      push: webPushCopy.pendingDealer(dealer)
    }
  )
}

/** 4 — Trip in progress → staff (tóm tắt các điểm giao) */
const onTripStarted = async (trip) => {
  const deliveryStops = (trip.stops || []).filter(
    (stop) => stop.purpose === tripModel.STOP_PURPOSE.DELIVERY || !stop.purpose
  )

  if (!deliveryStops.length) {
    await notifyStaff(telegramTemplates.tripStartedStaff({ trip, stops: [] }), {
      push: webPushCopy.tripStarted(trip, 0),
      track: { entityType: 'trip', entityId: trip.id, kind: 'trip_started' }
    })
    return
  }

  const stopsWithDealer = []
  for (const stop of deliveryStops) {
    const dealer = stop.dealerId
      ? await dealerModel.findOneById(stop.dealerId)
      : null
    stopsWithDealer.push({ stop, dealer })
  }

  await notifyStaff(
    telegramTemplates.tripStartedStaff({ trip, stops: stopsWithDealer }),
    {
      push: webPushCopy.tripStarted(trip, deliveryStops.length),
      track: { entityType: 'trip', entityId: trip.id, kind: 'trip_started' }
    }
  )
}

/** 5 — New lead → staff */
const onLeadCreated = async (lead) => {
  await notifyStaff(telegramTemplates.newLeadStaff(lead), {
    replyMarkup: telegramKeyboards.leadStatuses(
      lead.id,
      lead.status || leadModel.LEAD_STATUS.NEW
    ),
    track: {
      entityType: 'lead',
      entityId: lead.id,
      kind: TRACK_KIND.LEAD
    },
    push: webPushCopy.newLead(lead)
  })
}

/** 6 — Pending order → staff */
const onOrderCreated = async (order) => {
  if (order.status !== orderModel.ORDER_STATUS.PENDING) return

  await notifyStaff(telegramTemplates.pendingOrderStaff(order), {
    replyMarkup: telegramKeyboards.orderActions(order),
    track: {
      entityType: 'order',
      entityId: order.id,
      kind: TRACK_KIND.PENDING_ORDER
    },
    push: webPushCopy.pendingOrder(order)
  })
}

/** 7 — Low stock → staff */
const onStockChanged = async ({ productId, warehouseId, quantity }) => {
  if (typeof quantity !== 'number' || quantity > LOW_STOCK_THRESHOLD) return

  const [product, warehouse] = await Promise.all([
    productModel.findOneById(productId),
    warehouseId ? warehouseModel.findOneById(warehouseId) : null
  ])

  const productName = product?.name || 'Sản phẩm'
  const warehouseName = warehouse?.name || ''

  await notifyStaff(
    telegramTemplates.lowStockStaff({
      productName,
      quantity,
      warehouseName
    }),
    {
      push: webPushCopy.lowStock({ productName, quantity, warehouseName }),
      track: { entityType: 'product', entityId: productId, kind: 'low_stock' }
    }
  )
}

export const telegramNotifyService = {
  LOW_STOCK_THRESHOLD,
  TRACK_KIND,
  fireAndForget,
  notifyStaff,
  onOrderStatusChanged: (prev, order) => fireAndForget(onOrderStatusChanged(prev, order)),
  onPaymentUpdated: (order) => fireAndForget(onPaymentUpdated(order)),
  onDealerStatusChanged: (prev, dealer) =>
    fireAndForget(onDealerStatusChanged(prev, dealer)),
  onDealerCreated: (dealer) => fireAndForget(onDealerCreated(dealer)),
  onTripStarted: (trip) => fireAndForget(onTripStarted(trip)),
  onLeadCreated: (lead) => fireAndForget(onLeadCreated(lead)),
  onOrderCreated: (order) => fireAndForget(onOrderCreated(order)),
  onStockChanged: (payload) => fireAndForget(onStockChanged(payload))
}
