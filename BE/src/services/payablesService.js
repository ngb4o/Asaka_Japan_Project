import { GET_DB } from '~/config/mongodb'
import { purchaseInvoiceModel } from '~/models/purchaseInvoiceModel'
import { supplierModel } from '~/models/supplierModel'

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Supplier AP = Σ max(0, total − paidAmount) on open unpaid/partial purchase invoices.
 */
const getSummary = async (query = {}) => {
  const search = String(query.q || query.search || '').trim()

  const rows = await GET_DB()
    .collection(purchaseInvoiceModel.PURCHASE_INVOICE_COLLECTION_NAME)
    .aggregate([
      {
        $match: {
          _destroy: false,
          status: purchaseInvoiceModel.INVOICE_STATUS.OPEN,
          paymentStatus: {
            $in: [
              purchaseInvoiceModel.PAYMENT_STATUS.UNPAID,
              purchaseInvoiceModel.PAYMENT_STATUS.PARTIAL
            ]
          }
        }
      },
      {
        $group: {
          _id: '$supplierId',
          invoiceTotal: { $sum: { $ifNull: ['$total', 0] } },
          paidAmount: { $sum: { $ifNull: ['$paidAmount', 0] } },
          debtInvoiceCount: { $sum: 1 },
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
        invoiceTotal: 0,
        supplierCount: 0,
        debtInvoiceCount: 0
      },
      items: []
    }
  }

  const suppliers = await GET_DB()
    .collection(supplierModel.SUPPLIER_COLLECTION_NAME)
    .find({
      _id: { $in: rows.map((row) => row._id) },
      _destroy: false
    })
    .toArray()

  const supplierMap = new Map(suppliers.map((item) => [item._id.toString(), item]))

  let items = rows.map((row) => {
    const supplier = supplierMap.get(row._id.toString())
    return {
      supplierId: row._id.toString(),
      supplierName: supplier?.name || 'NCC đã xóa',
      contactName: supplier?.contactName || '',
      phone: supplier?.phone || '',
      taxCode: supplier?.taxCode || '',
      status: supplier?.status || null,
      invoiceTotal: row.invoiceTotal,
      paidAmount: row.paidAmount,
      debtAmount: row.debtAmount,
      debtInvoiceCount: row.debtInvoiceCount
    }
  })

  if (search) {
    const pattern = escapeRegex(search).toLowerCase()
    items = items.filter((item) => {
      const haystack = [
        item.supplierName,
        item.contactName,
        item.phone,
        item.taxCode
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
      acc.invoiceTotal += item.invoiceTotal
      acc.debtInvoiceCount += item.debtInvoiceCount
      return acc
    },
    {
      debtAmount: 0,
      paidAmount: 0,
      invoiceTotal: 0,
      debtInvoiceCount: 0
    }
  )

  return {
    totals: {
      ...totals,
      supplierCount: items.length
    },
    items
  }
}

export const payablesService = {
  getSummary
}
