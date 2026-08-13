import { ObjectId } from 'mongodb'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { GET_DB } from '~/config/mongodb'
import { orderModel } from '~/models/orderModel'
import { dealerModel } from '~/models/dealerModel'
import { isMailConfigured, sendMail } from '~/services/mailService'
import {
  buildDebtReminderEmail,
  normalizeInvoiceEmail
} from '~/services/debtReminderEmailService'

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Dealer outstanding = Σ max(0, total − paidAmount) on non-cancelled
 * unpaid/partial orders that have a dealerId.
 */
const getSummary = async (query = {}) => {
  const search = String(query.q || query.search || '').trim()

  const rows = await GET_DB()
    .collection(orderModel.ORDER_COLLECTION_NAME)
    .aggregate([
      {
        $match: {
          _destroy: false,
          status: { $ne: orderModel.ORDER_STATUS.CANCELLED },
          paymentStatus: {
            $in: [
              orderModel.PAYMENT_STATUS.UNPAID,
              orderModel.PAYMENT_STATUS.PARTIAL
            ]
          },
          dealerId: { $ne: null, $exists: true }
        }
      },
      {
        $group: {
          _id: '$dealerId',
          orderTotal: { $sum: { $ifNull: ['$total', 0] } },
          paidAmount: { $sum: { $ifNull: ['$paidAmount', 0] } },
          debtOrderCount: { $sum: 1 },
          debtAmount: {
            $sum: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ['$total', 0] },
                    { $ifNull: ['$paidAmount', 0] }
                  ]
                }
              ]
            }
          }
        }
      },
      { $match: { debtAmount: { $gt: 0 } } },
      { $sort: { debtAmount: -1 } }
    ])
    .toArray()

  if (!rows.length) {
    return {
      totals: {
        debtAmount: 0,
        paidAmount: 0,
        orderTotal: 0,
        dealerCount: 0,
        debtOrderCount: 0
      },
      items: []
    }
  }

  const dealers = await GET_DB()
    .collection(dealerModel.DEALER_COLLECTION_NAME)
    .find({
      _id: { $in: rows.map((row) => row._id) },
      _destroy: false
    })
    .toArray()

  const dealerMap = new Map(dealers.map((item) => [item._id.toString(), item]))

  let items = rows.map((row) =>
    formatDealerSummary(dealerMap.get(row._id.toString()), row)
  )

  if (search) {
    const pattern = escapeRegex(search).toLowerCase()
    items = items.filter((item) => {
      const haystack = [
        item.dealerName,
        item.contactName,
        item.phone,
        item.region,
        item.email
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(pattern)
    })
  }

  const totals = items.reduce(
    (acc, item) => {
      acc.debtAmount += item.debtAmount
      acc.paidAmount += item.paidAmount
      acc.orderTotal += item.orderTotal
      acc.debtOrderCount += item.debtOrderCount
      return acc
    },
    {
      debtAmount: 0,
      paidAmount: 0,
      orderTotal: 0,
      debtOrderCount: 0
    }
  )

  return {
    totals: {
      ...totals,
      dealerCount: items.length
    },
    items
  }
}

function formatDealerSummary(dealer, row) {
  return {
    dealerId: row._id.toString(),
    dealerName: dealer?.name || 'Đại lý đã xóa',
    contactName: dealer?.contactName || '',
    phone: dealer?.phone || '',
    email: dealer?.email || '',
    region: dealer?.region || '',
    status: dealer?.status || null,
    orderTotal: row.orderTotal,
    paidAmount: row.paidAmount,
    debtAmount: row.debtAmount,
    debtOrderCount: row.debtOrderCount,
    lastReminderAt: dealer?.lastReminderAt || null,
    lastReminderSentTo: dealer?.lastReminderSentTo || '',
    lastReminderError: dealer?.lastReminderError || ''
  }
}

async function listDealerDebtOrders(dealerId) {
  const docs = await GET_DB()
    .collection(orderModel.ORDER_COLLECTION_NAME)
    .find({
      _destroy: false,
      dealerId: new ObjectId(dealerId),
      status: { $ne: orderModel.ORDER_STATUS.CANCELLED },
      paymentStatus: {
        $in: [
          orderModel.PAYMENT_STATUS.UNPAID,
          orderModel.PAYMENT_STATUS.PARTIAL
        ]
      }
    })
    .project({
      code: 1,
      createdAt: 1,
      total: 1,
      paidAmount: 1,
      customerEmail: 1
    })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray()

  return docs
    .map((item) => {
      const total = Number(item.total) || 0
      const paidAmount = Number(item.paidAmount) || 0
      const remainingAmount = Math.max(0, total - paidAmount)
      return {
        code: item.code || '',
        createdAt: item.createdAt,
        total,
        paidAmount,
        remainingAmount,
        customerEmail: item.customerEmail || ''
      }
    })
    .filter((item) => item.remainingAmount > 0)
}

const sendDealerReminderEmail = async (dealerId, { email } = {}) => {
  const dealer = await dealerModel.findOneById(dealerId)
  if (!dealer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đại lý!')
  }

  const orders = await listDealerDebtOrders(dealerId)
  const debtAmount = orders.reduce((sum, item) => sum + item.remainingAmount, 0)
  if (!orders.length || debtAmount <= 0) {
    throw new ApiError(StatusCodes.CONFLICT, 'Đại lý không còn công nợ để nhắc!')
  }

  const fallbackOrderEmail = orders.find((item) =>
    normalizeInvoiceEmail(item.customerEmail)
  )?.customerEmail
  const to = normalizeInvoiceEmail(email || dealer.email || fallbackOrderEmail)

  if (!to) {
    const error = 'Chưa có email đại lý'
    await dealerModel.update(dealerId, { lastReminderError: error })
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `${error}. Thêm email rồi gửi lại.`
    )
  }

  if (!isMailConfigured()) {
    const error = 'Chưa cấu hình email máy chủ (SMTP, Gmail API hoặc Resend)'
    await dealerModel.update(dealerId, { lastReminderError: error })
    throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, error)
  }

  const payload = buildDebtReminderEmail({
    dealer: {
      name: dealer.name,
      contactName: dealer.contactName,
      phone: dealer.phone,
      address: dealer.address
    },
    orders,
    debtAmount
  })

  try {
    await sendMail({ to, ...payload })
  } catch (error) {
    const message = error?.message || 'Không gửi được email'
    await dealerModel.update(dealerId, {
      lastReminderError: message.slice(0, 500)
    })
    throw new ApiError(
      StatusCodes.BAD_GATEWAY,
      `Không gửi được nhắc nợ: ${message}`
    )
  }

  const patch = {
    lastReminderAt: new Date(),
    lastReminderSentTo: to,
    lastReminderError: ''
  }
  if (to !== normalizeInvoiceEmail(dealer.email)) {
    patch.email = to
  }
  await dealerModel.update(dealerId, patch)

  const paidAmount = orders.reduce((sum, item) => sum + item.paidAmount, 0)
  const orderTotal = orders.reduce((sum, item) => sum + item.total, 0)
  const updated = await dealerModel.findOneById(dealerId)

  return formatDealerSummary(updated, {
    _id: dealerId,
    orderTotal,
    paidAmount,
    debtAmount,
    debtOrderCount: orders.length
  })
}

export const receivablesService = {
  getSummary,
  sendDealerReminderEmail
}
