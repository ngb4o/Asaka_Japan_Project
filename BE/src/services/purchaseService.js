import { ObjectId } from 'mongodb'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { purchaseInvoiceModel } from '~/models/purchaseInvoiceModel'
import { supplierModel } from '~/models/supplierModel'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { GET_DB } from '~/config/mongodb'

const resolvePaymentStatus = (paidAmount, total) => {
  const paid = Math.max(0, Number(paidAmount) || 0)
  const orderTotal = Math.max(0, Number(total) || 0)
  if (orderTotal <= 0 || paid <= 0) {
    return { paymentStatus: purchaseInvoiceModel.PAYMENT_STATUS.UNPAID, paidAmount: 0 }
  }
  if (paid >= orderTotal) {
    return {
      paymentStatus: purchaseInvoiceModel.PAYMENT_STATUS.PAID,
      paidAmount: orderTotal
    }
  }
  return {
    paymentStatus: purchaseInvoiceModel.PAYMENT_STATUS.PARTIAL,
    paidAmount: paid
  }
}

const buildCode = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `PN-${y}${m}${d}-${rand}`
}

const enrichInvoice = (invoice, supplierMap = new Map()) => {
  const formatted = formatDocument(invoice)
  const total = Number(formatted.total) || 0
  const paidAmount = Number(formatted.paidAmount) || 0
  const supplier = supplierMap.get(formatted.supplierId)
  return {
    ...formatted,
    remainingAmount: Math.max(0, total - paidAmount),
    supplierName: supplier?.name || '',
    supplierPhone: supplier?.phone || ''
  }
}

/** Tạo phiếu nhập mua từ 1 lần nhập kho (gắn NCC). */
const createFromStockImport = async (
  {
    supplierId,
    warehouseId,
    productId,
    productName = '',
    quantity,
    unitType,
    quantityBase,
    unitCost,
    totalCost,
    transactionId,
    note = '',
    dueDate = null,
    paymentStatus: rawPaymentStatus = purchaseInvoiceModel.PAYMENT_STATUS.UNPAID,
    createdBy
  },
  session = null
) => {
  const supplier = await supplierModel.findOneById(supplierId)
  if (!supplier) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Không tìm thấy nhà cung cấp!')
  }
  if (supplier.status !== supplierModel.SUPPLIER_STATUS.ACTIVE) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Nhà cung cấp đang ngưng!')
  }

  const total = Math.max(0, Number(totalCost) || 0)
  const isPaid = rawPaymentStatus === purchaseInvoiceModel.PAYMENT_STATUS.PAID
  const payment = resolvePaymentStatus(isPaid ? total : 0, total)

  const created = await purchaseInvoiceModel.createNew(
    {
      code: buildCode(),
      supplierId,
      warehouseId: warehouseId || null,
      invoiceDate: new Date(),
      dueDate: !isPaid && dueDate ? new Date(dueDate) : null,
      items: [
        {
          productId,
          productName,
          quantity,
          unitType,
          quantityBase,
          unitCost: Number(unitCost) || 0,
          totalCost: total,
          transactionId: transactionId || null
        }
      ],
      total,
      paidAmount: payment.paidAmount,
      paymentStatus: payment.paymentStatus,
      status: purchaseInvoiceModel.INVOICE_STATUS.OPEN,
      note: note || '',
      createdBy
    },
    session
  )

  return created.insertedId.toString()
}

const getList = async (query = {}) => {
  const findQuery = {
    status: purchaseInvoiceModel.INVOICE_STATUS.OPEN
  }
  if (query.supplierId) findQuery.supplierId = new ObjectId(query.supplierId)
  if (query.paymentStatus) findQuery.paymentStatus = query.paymentStatus
  if (query.hasDebt === 'true' || query.hasDebt === true) {
    findQuery.paymentStatus = {
      $in: [
        purchaseInvoiceModel.PAYMENT_STATUS.UNPAID,
        purchaseInvoiceModel.PAYMENT_STATUS.PARTIAL
      ]
    }
  }

  const pagination = parsePaginationQuery(query)
  const result = await purchaseInvoiceModel.findMany(findQuery, {
    limit: pagination.limit,
    skip: pagination.skip
  })

  const supplierIds = [
    ...new Set(result.items.map((item) => item.supplierId.toString()))
  ]
  const suppliers = supplierIds.length
    ? await GET_DB()
      .collection(supplierModel.SUPPLIER_COLLECTION_NAME)
      .find({ _id: { $in: supplierIds.map((id) => new ObjectId(id)) } })
      .toArray()
    : []
  const supplierMap = new Map(
    suppliers.map((item) => [item._id.toString(), item])
  )

  const items = result.items
    .map((item) => enrichInvoice(item, supplierMap))
    .filter((item) => {
      if (!(query.hasDebt === 'true' || query.hasDebt === true)) return true
      return item.remainingAmount > 0
    })

  return buildPaginationResult(
    {
      items,
      total: result.total,
      limit: pagination.limit,
      skip: pagination.skip
    },
    pagination.page
  )
}

const getDetails = async (invoiceId) => {
  const invoice = await purchaseInvoiceModel.findOneById(invoiceId)
  if (!invoice) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy phiếu nhập mua!')
  }
  const supplier = await supplierModel.findOneById(invoice.supplierId)
  const supplierMap = new Map()
  if (supplier) supplierMap.set(supplier._id.toString(), supplier)
  return enrichInvoice(invoice, supplierMap)
}

const recordPayment = async (invoiceId, { amount, note = '' }) => {
  const invoice = await purchaseInvoiceModel.findOneById(invoiceId)
  if (!invoice) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy phiếu nhập mua!')
  }
  if (invoice.status === purchaseInvoiceModel.INVOICE_STATUS.CANCELLED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Phiếu đã hủy!')
  }

  const payAmount = Number(amount)
  if (!Number.isFinite(payAmount) || payAmount <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Số tiền thanh toán không hợp lệ!')
  }

  const remaining = Math.max(
    0,
    (Number(invoice.total) || 0) - (Number(invoice.paidAmount) || 0)
  )
  if (payAmount > remaining + 0.0001) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Số tiền vượt công nợ còn lại (${remaining})!`
    )
  }

  const nextPaid = (Number(invoice.paidAmount) || 0) + payAmount
  const payment = resolvePaymentStatus(nextPaid, invoice.total)
  const noteLine = String(note || '').trim()
  const nextNote = noteLine
    ? `${invoice.note || ''}${invoice.note ? '\n' : ''}[TT] ${noteLine}`.slice(0, 1000)
    : invoice.note

  await purchaseInvoiceModel.update(invoiceId, {
    paidAmount: payment.paidAmount,
    paymentStatus: payment.paymentStatus,
    note: nextNote
  })

  return getDetails(invoiceId)
}

export const purchaseService = {
  createFromStockImport,
  getList,
  getDetails,
  recordPayment
}
