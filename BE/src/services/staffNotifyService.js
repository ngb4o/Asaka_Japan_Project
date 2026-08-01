/* eslint-disable no-console */
import { dealerModel } from '~/models/dealerModel'
import { productModel } from '~/models/productModel'
import { warehouseModel } from '~/models/warehouseModel'
import { orderModel } from '~/models/orderModel'
import { tripModel } from '~/models/tripModel'
import { webPushService } from '~/services/webPushService'
import { webPushCopy } from '~/services/webPushCopy'

const LOW_STOCK_THRESHOLD = 20

const fireAndForget = (promise) => {
  Promise.resolve(promise).catch((error) => {
    console.error('[staff-notify] error', error?.message || error)
  })
}

/** Push CRM events to subscribed staff devices (PWA). */
const notifyStaff = async (_text, options = {}) => {
  fireAndForget(webPushService.notifyStaff(_text, options))
}

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

  const copy = webPushCopy.orderStatus(order)
  await notifyStaff(copy.body, { push: copy })

  if (
    order.status === orderModel.ORDER_STATUS.COMPLETED &&
    [orderModel.PAYMENT_STATUS.UNPAID, orderModel.PAYMENT_STATUS.PARTIAL].includes(
      order.paymentStatus
    )
  ) {
    const reminder = webPushCopy.paymentReminder(order)
    await notifyStaff(reminder.body, { push: reminder })
  }
}

const onPaymentUpdated = async (order) => {
  const copy = webPushCopy.paymentUpdate(order)
  await notifyStaff(copy.body, { push: copy })
}

const onDealerStatusChanged = async (previousStatus, dealer) => {
  if (
    previousStatus === dealerModel.DEALER_STATUS.PENDING &&
    dealer.status === dealerModel.DEALER_STATUS.ACTIVE
  ) {
    const copy = webPushCopy.dealerApproved(dealer)
    await notifyStaff(copy.body, { push: copy })
  }

  if (
    dealer.status === dealerModel.DEALER_STATUS.PENDING &&
    previousStatus !== dealerModel.DEALER_STATUS.PENDING
  ) {
    const copy = webPushCopy.pendingDealer(dealer)
    await notifyStaff(copy.body, { push: copy })
  }
}

const onDealerCreated = async (dealer) => {
  if (dealer.status !== dealerModel.DEALER_STATUS.PENDING) return
  const copy = webPushCopy.pendingDealer(dealer)
  await notifyStaff(copy.body, { push: copy })
}

const onTripStarted = async (trip) => {
  const deliveryStops = (trip.stops || []).filter(
    (stop) => stop.purpose === tripModel.STOP_PURPOSE.DELIVERY || !stop.purpose
  )
  const copy = webPushCopy.tripStarted(trip, deliveryStops.length)
  await notifyStaff(copy.body, { push: copy })
}

const onLeadCreated = async (lead) => {
  const copy = webPushCopy.newLead(lead)
  await notifyStaff(copy.body, { push: copy })
}

const onOrderCreated = async (order) => {
  if (order.status !== orderModel.ORDER_STATUS.PENDING) return
  const copy = webPushCopy.pendingOrder(order)
  await notifyStaff(copy.body, { push: copy })
}

const onStockChanged = async ({ productId, warehouseId, quantity }) => {
  if (typeof quantity !== 'number' || quantity > LOW_STOCK_THRESHOLD) return

  const [product, warehouse] = await Promise.all([
    productModel.findOneById(productId),
    warehouseId ? warehouseModel.findOneById(warehouseId) : null
  ])

  const copy = webPushCopy.lowStock({
    productName: product?.name || 'Sản phẩm',
    quantity,
    warehouseName: warehouse?.name || '',
    productId
  })
  await notifyStaff(copy.body, { push: copy })
}

export const staffNotifyService = {
  LOW_STOCK_THRESHOLD,
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
