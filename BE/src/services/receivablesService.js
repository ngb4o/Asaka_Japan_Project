import { GET_DB } from '~/config/mongodb'
import { orderModel } from '~/models/orderModel'
import { dealerModel } from '~/models/dealerModel'

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

  let items = rows.map((row) => {
    const dealer = dealerMap.get(row._id.toString())
    return {
      dealerId: row._id.toString(),
      dealerName: dealer?.name || 'Đại lý đã xóa',
      contactName: dealer?.contactName || '',
      phone: dealer?.phone || '',
      region: dealer?.region || '',
      status: dealer?.status || null,
      orderTotal: row.orderTotal,
      paidAmount: row.paidAmount,
      debtAmount: row.debtAmount,
      debtOrderCount: row.debtOrderCount
    }
  })

  if (search) {
    const pattern = escapeRegex(search).toLowerCase()
    items = items.filter((item) => {
      const haystack = [
        item.dealerName,
        item.contactName,
        item.phone,
        item.region
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

export const receivablesService = {
  getSummary
}
