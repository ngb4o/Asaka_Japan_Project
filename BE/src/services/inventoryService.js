import { ObjectId } from 'mongodb'
import { GET_CLIENT, GET_DB } from '~/config/mongodb'
import { warehouseModel } from '~/models/warehouseModel'
import { warehouseStockModel } from '~/models/warehouseStockModel'
import { inventoryTransactionModel } from '~/models/inventoryTransactionModel'
import { productModel } from '~/models/productModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { toBaseQuantity, toUnitsPerCase, UNIT_TYPE } from '~/utils/inventoryUnits'
import { staffNotifyService } from '~/services/staffNotifyService'
import { buildSearchFilter } from '~/utils/search.js'
import { purchaseService } from '~/services/purchaseService'
import { supplierModel } from '~/models/supplierModel'

const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const endOfDay = (date) => {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)

const parseLocalDateInput = (value, end = false) => {
  const raw = String(value || '').trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    const date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    )
    return end ? endOfDay(date) : startOfDay(date)
  }
  const date = new Date(raw)
  return end ? endOfDay(date) : startOfDay(date)
}

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100

const ensureWarehouseExists = async (warehouseId) => {
  const warehouse = await warehouseModel.findOneById(warehouseId)

  if (!warehouse) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Không tìm thấy kho hàng!')
  }

  if (warehouse.status !== warehouseModel.WAREHOUSE_STATUS.ACTIVE) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Kho hàng đang ngưng hoạt động!')
  }

  return warehouse
}

const ensureProductExists = async (productId) => {
  const product = await productModel.findOneById(productId)

  if (!product) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Không tìm thấy sản phẩm!')
  }

  return product
}

const runInTransaction = async (callback) => {
  const session = GET_CLIENT().startSession()

  try {
    let result

    await session.withTransaction(async () => {
      result = await callback(session)
    })

    return result
  } finally {
    await session.endSession()
  }
}

const createTransaction = async (type, reqBody, userId) => {
  const {
    warehouseId,
    productId,
    quantity,
    unitType = UNIT_TYPE.BOTTLE,
    note = '',
    unitCost: rawUnitCost,
    supplierId: rawSupplierId
  } = reqBody

  await ensureWarehouseExists(warehouseId)
  const product = await ensureProductExists(productId)

  const supplierId =
    type === inventoryTransactionModel.TRANSACTION_TYPE.IMPORT && rawSupplierId
      ? String(rawSupplierId)
      : null

  if (supplierId) {
    const supplier = await supplierModel.findOneById(supplierId)
    if (!supplier) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không tìm thấy nhà cung cấp!')
    }
    if (supplier.status !== supplierModel.SUPPLIER_STATUS.ACTIVE) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Nhà cung cấp đang ngưng!')
    }
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Số lượng phải lớn hơn 0!')
  }

  if (![UNIT_TYPE.BOTTLE, UNIT_TYPE.CASE].includes(unitType)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Đơn vị không hợp lệ!')
  }

  const unitsPerCase = toUnitsPerCase(product.unitsPerCase)

  if (unitType === UNIT_TYPE.CASE && unitsPerCase <= 1) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Sản phẩm chưa cấu hình số lượng mỗi thùng!'
    )
  }

  let quantityBase
  try {
    quantityBase = toBaseQuantity(quantity, unitType, unitsPerCase)
  } catch (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.message)
  }

  const isImport = type === inventoryTransactionModel.TRANSACTION_TYPE.IMPORT
  let unitCost = 0
  if (isImport) {
    unitCost = Math.max(0, Number(rawUnitCost) || 0)
  } else {
    // Stamp export COGS from current product cost (per selected unit)
    const costPerBottle = Math.max(0, Number(product.costPrice) || 0)
    unitCost =
      unitType === UNIT_TYPE.CASE
        ? costPerBottle * unitsPerCase
        : costPerBottle
  }
  const totalCost = Math.round(unitCost * quantity * 100) / 100

  return await runInTransaction(async (session) => {
    let stockResult

    if (isImport) {
      stockResult = await warehouseStockModel.increaseStock(
        warehouseId,
        productId,
        quantityBase,
        session
      )
    } else {
      stockResult = await warehouseStockModel.decreaseStock(
        warehouseId,
        productId,
        quantityBase,
        session
      )

      if (!stockResult) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Tồn kho không đủ để xuất!')
      }
    }

    if (!stockResult || typeof stockResult.quantity !== 'number') {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Cập nhật tồn kho thất bại!')
    }

    const balanceAfter = stockResult.quantity
    const previousQuantity = isImport
      ? balanceAfter - quantityBase
      : balanceAfter + quantityBase

    const created = await inventoryTransactionModel.createNew(
      {
        type,
        warehouseId,
        productId,
        quantity,
        unitType,
        quantityBase,
        unitsPerCase,
        note,
        unitCost,
        totalCost,
        supplierId: supplierId || null,
        purchaseId: null,
        balanceAfter,
        createdBy: userId
      },
      session
    )

    const transaction = await GET_DB()
      .collection(inventoryTransactionModel.INVENTORY_TRANSACTION_COLLECTION_NAME)
      .findOne({ _id: created.insertedId }, { session })

    return {
      formatted: formatDocument(transaction),
      balanceAfter,
      previousQuantity,
      quantityBase,
      productName: product.name || '',
      unitType,
      unitCost,
      totalCost,
      supplierId,
      shouldUpdateCost: isImport && unitCost > 0,
      costPerBottle:
        isImport && unitCost > 0
          ? unitType === UNIT_TYPE.CASE
            ? unitCost / Math.max(1, unitsPerCase)
            : unitCost
          : null
    }
  })
}

const importStock = async (reqBody, userId) => {
  const result = await createTransaction(
    inventoryTransactionModel.TRANSACTION_TYPE.IMPORT,
    reqBody,
    userId
  )
  if (result.shouldUpdateCost && result.costPerBottle != null) {
    // Weighted average cost (WAC) theo chai
    const product = await productModel.findOneById(reqBody.productId)
    const prevQty = Math.max(0, Number(result.previousQuantity) || 0)
    const rawAddQty =
      Number(result.quantityBase) ||
      Number(result.balanceAfter) - Number(result.previousQuantity) ||
      0
    const addQty = Math.max(0, rawAddQty)
    const prevCost = Math.max(0, Number(product?.costPrice) || 0)
    const addCost = result.costPerBottle
    const totalQty = prevQty + addQty
    const nextCost =
      totalQty > 0
        ? (prevQty * prevCost + addQty * addCost) / totalQty
        : addCost

    await productModel.update(reqBody.productId, {
      costPrice: Math.round(nextCost * 100) / 100
    })
  }

  let purchaseId = null
  if (result.supplierId && result.formatted?.id) {
    purchaseId = await purchaseService.createFromStockImport({
      supplierId: result.supplierId,
      warehouseId: reqBody.warehouseId,
      productId: reqBody.productId,
      productName: result.productName,
      quantity: reqBody.quantity,
      unitType: result.unitType,
      quantityBase: result.quantityBase,
      unitCost: result.unitCost,
      totalCost: result.totalCost,
      transactionId: result.formatted.id,
      note: reqBody.note || '',
      dueDate: reqBody.dueDate || null,
      paymentStatus: reqBody.paymentStatus || 'unpaid',
      createdBy: userId
    })

    await GET_DB()
      .collection(inventoryTransactionModel.INVENTORY_TRANSACTION_COLLECTION_NAME)
      .updateOne(
        { _id: new ObjectId(result.formatted.id) },
        { $set: { purchaseId: new ObjectId(purchaseId) } }
      )
  }

  staffNotifyService.onStockChanged({
    productId: reqBody.productId,
    warehouseId: reqBody.warehouseId,
    quantity: result.balanceAfter,
    previousQuantity: result.previousQuantity
  })
  return {
    ...result.formatted,
    purchaseId,
    supplierId: result.supplierId
  }
}

const exportStock = async (reqBody, userId) => {
  const result = await createTransaction(
    inventoryTransactionModel.TRANSACTION_TYPE.EXPORT,
    reqBody,
    userId
  )
  staffNotifyService.onStockChanged({
    productId: reqBody.productId,
    warehouseId: reqBody.warehouseId,
    quantity: result.balanceAfter,
    previousQuantity: result.previousQuantity
  })
  return result.formatted
}

const getStocks = async (query) => {
  const findQuery = {}

  if (query.warehouseId) {
    findQuery.warehouseId = new ObjectId(query.warehouseId)
  }

  if (query.productId) {
    findQuery.productId = new ObjectId(query.productId)
  }

  if (query.search) {
    const products = await GET_DB()
      .collection(productModel.PRODUCT_COLLECTION_NAME)
      .find({
        _destroy: false,
        ...(buildSearchFilter(['name', 'sku'], query.search) || { _id: null })
      })
      .project({ _id: 1 })
      .limit(200)
      .toArray()

    const productIds = products.map((item) => item._id)

    if (!productIds.length) {
      const pagination = parsePaginationQuery(query)
      return buildPaginationResult(
        {
          items: [],
          total: 0,
          limit: pagination.limit,
          skip: pagination.skip
        },
        pagination.page
      )
    }

    findQuery.productId = { $in: productIds }
  }

  const pagination = parsePaginationQuery(query)

  const result = await warehouseStockModel.findMany(findQuery, {
    limit: pagination.limit,
    skip: pagination.skip
  })

  const warehouseIds = [...new Set(result.items.map((item) => item.warehouseId.toString()))]
  const productIds = [...new Set(result.items.map((item) => item.productId.toString()))]

  const warehouses = warehouseIds.length
    ? await GET_DB()
      .collection(warehouseModel.WAREHOUSE_COLLECTION_NAME)
      .find({ _id: { $in: warehouseIds.map((id) => new ObjectId(id)) } })
      .toArray()
    : []

  const products = productIds.length
    ? await GET_DB()
      .collection(productModel.PRODUCT_COLLECTION_NAME)
      .find({ _id: { $in: productIds.map((id) => new ObjectId(id)) } })
      .toArray()
    : []

  const warehouseMap = new Map(warehouses.map((item) => [item._id.toString(), item.name]))
  const productMap = new Map(
    products.map((item) => [
      item._id.toString(),
      {
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        unitsPerCase: toUnitsPerCase(item.unitsPerCase),
        costPrice: Math.max(0, Number(item.costPrice) || 0),
        image: item.image || (Array.isArray(item.images) ? item.images[0] : '') || ''
      }
    ])
  )

  const items = formatDocuments(result.items).map((item) => {
    const product = productMap.get(item.productId)
    const costPrice = product?.costPrice || 0
    const quantity = Number(item.quantity) || 0
    const stockValue = Math.round(quantity * costPrice * 100) / 100

    return {
      ...item,
      warehouseName: warehouseMap.get(item.warehouseId) || '',
      productName: product?.name || '',
      productSku: product?.sku || '',
      productUnit: product?.unit || 'chai',
      productImage: product?.image || '',
      unitsPerCase: product?.unitsPerCase || 1,
      costPrice,
      stockValue
    }
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

/** Vốn tồn kho = Σ(quantity × product.costPrice), quantity tính theo chai. */
const getStockValuation = async (query = {}) => {
  const match = { quantity: { $gt: 0 } }
  if (query.warehouseId) {
    match.warehouseId = new ObjectId(query.warehouseId)
  }

  const [facet] = await GET_DB()
    .collection(warehouseStockModel.WAREHOUSE_STOCK_COLLECTION_NAME)
    .aggregate([
      { $match: match },
      {
        $lookup: {
          from: productModel.PRODUCT_COLLECTION_NAME,
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          costPrice: { $ifNull: ['$product.costPrice', 0] },
          stockValue: {
            $multiply: [
              '$quantity',
              { $ifNull: ['$product.costPrice', 0] }
            ]
          }
        }
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalValue: { $sum: '$stockValue' },
                totalQuantity: { $sum: '$quantity' },
                lineCount: { $sum: 1 },
                zeroCostLines: {
                  $sum: {
                    $cond: [{ $lte: ['$costPrice', 0] }, 1, 0]
                  }
                }
              }
            }
          ],
          byWarehouse: [
            {
              $group: {
                _id: '$warehouseId',
                totalValue: { $sum: '$stockValue' },
                totalQuantity: { $sum: '$quantity' },
                lineCount: { $sum: 1 }
              }
            },
            { $sort: { totalValue: -1 } }
          ]
        }
      }
    ])
    .toArray()

  const summary = facet?.summary?.[0] || {
    totalValue: 0,
    totalQuantity: 0,
    lineCount: 0,
    zeroCostLines: 0
  }

  const warehouseIds = (facet?.byWarehouse || [])
    .map((row) => row._id)
    .filter(Boolean)

  const warehouses = warehouseIds.length
    ? await GET_DB()
      .collection(warehouseModel.WAREHOUSE_COLLECTION_NAME)
      .find({ _id: { $in: warehouseIds } })
      .toArray()
    : []

  const warehouseNameMap = new Map(
    warehouses.map((item) => [item._id.toString(), item.name])
  )

  return {
    totalValue: Math.round((summary.totalValue || 0) * 100) / 100,
    totalQuantity: summary.totalQuantity || 0,
    lineCount: summary.lineCount || 0,
    zeroCostLines: summary.zeroCostLines || 0,
    byWarehouse: (facet?.byWarehouse || []).map((row) => ({
      warehouseId: row._id?.toString?.() || String(row._id),
      warehouseName: warehouseNameMap.get(row._id?.toString?.() || '') || '',
      totalValue: Math.round((row.totalValue || 0) * 100) / 100,
      totalQuantity: row.totalQuantity || 0,
      lineCount: row.lineCount || 0
    }))
  }
}

const getTransactions = async (query) => {
  const findQuery = {}

  if (query.type) {
    findQuery.type = query.type
  }

  if (query.warehouseId) {
    findQuery.warehouseId = new ObjectId(query.warehouseId)
  }

  if (query.productId) {
    findQuery.productId = new ObjectId(query.productId)
  }

  const pagination = parsePaginationQuery(query)

  const result = await inventoryTransactionModel.findMany(findQuery, {
    limit: pagination.limit,
    skip: pagination.skip
  })

  const warehouseIds = [...new Set(result.items.map((item) => item.warehouseId.toString()))]
  const productIds = [...new Set(result.items.map((item) => item.productId.toString()))]

  const warehouses = warehouseIds.length
    ? await GET_DB()
      .collection(warehouseModel.WAREHOUSE_COLLECTION_NAME)
      .find({ _id: { $in: warehouseIds.map((id) => new ObjectId(id)) } })
      .toArray()
    : []

  const products = productIds.length
    ? await GET_DB()
      .collection(productModel.PRODUCT_COLLECTION_NAME)
      .find({ _id: { $in: productIds.map((id) => new ObjectId(id)) } })
      .toArray()
    : []

  const warehouseMap = new Map(warehouses.map((item) => [item._id.toString(), item.name]))
  const productMap = new Map(
    products.map((item) => [
      item._id.toString(),
      {
        name: item.name,
        unitsPerCase: toUnitsPerCase(item.unitsPerCase),
        image: item.image || (Array.isArray(item.images) ? item.images[0] : '') || ''
      }
    ])
  )

  const items = formatDocuments(result.items).map((item) => {
    const product = productMap.get(item.productId)

    return {
      ...item,
      warehouseName: warehouseMap.get(item.warehouseId) || '',
      productName: product?.name || '',
      productImage: product?.image || '',
      unitsPerCase: item.unitsPerCase || product?.unitsPerCase || 1,
      unitType: item.unitType || UNIT_TYPE.BOTTLE,
      quantityBase: item.quantityBase ?? item.quantity
    }
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

/**
 * Dòng vốn kho theo kỳ: nhập/xuất theo tiền, ước mở đầu–cuối kỳ,
 * quay vòng, top vốn & hàng chậm.
 */
const getFlowReport = async (query = {}) => {
  const now = new Date()
  const from = query.from
    ? parseLocalDateInput(query.from, false)
    : startOfDay(startOfMonth(now))
  const to = query.to ? parseLocalDateInput(query.to, true) : endOfDay(now)

  if (from.getTime() > to.getTime()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Khoảng ngày không hợp lệ!')
  }

  const match = {
    createdAt: { $gte: from, $lte: to }
  }
  if (query.warehouseId) {
    match.warehouseId = new ObjectId(query.warehouseId)
  }

  const txnCol = inventoryTransactionModel.INVENTORY_TRANSACTION_COLLECTION_NAME

  const [typeSummary, byProduct, series, valuation, topCapitalRows] =
    await Promise.all([
      GET_DB()
        .collection(txnCol)
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: '$type',
              totalValue: { $sum: { $ifNull: ['$totalCost', 0] } },
              totalQuantityBase: {
                $sum: { $ifNull: ['$quantityBase', '$quantity'] }
              },
              txnCount: { $sum: 1 }
            }
          }
        ])
        .toArray(),
      GET_DB()
        .collection(txnCol)
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: { productId: '$productId', type: '$type' },
              totalValue: { $sum: { $ifNull: ['$totalCost', 0] } },
              totalQuantityBase: {
                $sum: { $ifNull: ['$quantityBase', '$quantity'] }
              },
              txnCount: { $sum: 1 }
            }
          },
          { $sort: { totalValue: -1 } },
          { $limit: 40 }
        ])
        .toArray(),
      GET_DB()
        .collection(txnCol)
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: {
                day: {
                  $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                },
                type: '$type'
              },
              totalValue: { $sum: { $ifNull: ['$totalCost', 0] } }
            }
          },
          { $sort: { '_id.day': 1 } }
        ])
        .toArray(),
      getStockValuation(
        query.warehouseId ? { warehouseId: query.warehouseId } : {}
      ),
      GET_DB()
        .collection(warehouseStockModel.WAREHOUSE_STOCK_COLLECTION_NAME)
        .aggregate([
          {
            $match: {
              quantity: { $gt: 0 },
              ...(query.warehouseId
                ? { warehouseId: new ObjectId(query.warehouseId) }
                : {})
            }
          },
          {
            $group: {
              _id: '$productId',
              quantity: { $sum: '$quantity' }
            }
          },
          {
            $lookup: {
              from: productModel.PRODUCT_COLLECTION_NAME,
              localField: '_id',
              foreignField: '_id',
              as: 'product'
            }
          },
          { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
          {
            $addFields: {
              costPrice: { $ifNull: ['$product.costPrice', 0] },
              stockValue: {
                $multiply: [
                  '$quantity',
                  { $ifNull: ['$product.costPrice', 0] }
                ]
              },
              productName: { $ifNull: ['$product.name', ''] },
              productSku: { $ifNull: ['$product.sku', ''] }
            }
          },
          { $match: { stockValue: { $gt: 0 } } },
          { $sort: { stockValue: -1 } },
          { $limit: 10 }
        ])
        .toArray()
    ])

  const byType = Object.fromEntries(
    typeSummary.map((row) => [
      row._id,
      {
        totalValue: roundMoney(row.totalValue),
        totalQuantityBase: row.totalQuantityBase || 0,
        txnCount: row.txnCount || 0
      }
    ])
  )

  const importStats = byType.import || {
    totalValue: 0,
    totalQuantityBase: 0,
    txnCount: 0
  }
  const exportStats = byType.export || {
    totalValue: 0,
    totalQuantityBase: 0,
    txnCount: 0
  }

  const closingValue = valuation.totalValue || 0
  const openingValue = Math.max(
    0,
    roundMoney(closingValue - importStats.totalValue + exportStats.totalValue)
  )
  const avgValue = roundMoney((openingValue + closingValue) / 2)
  const dayMs = 24 * 60 * 60 * 1000
  const dayCount = Math.max(
    1,
    Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / dayMs) +
      1
  )
  const turnoverTimes =
    avgValue > 0 ? Math.round((exportStats.totalValue / avgValue) * 100) / 100 : 0
  const daysOfInventory =
    exportStats.totalValue > 0
      ? Math.round((avgValue / exportStats.totalValue) * dayCount * 10) / 10
      : null

  const productIds = [
    ...new Set([
      ...byProduct.map((row) => row._id.productId?.toString()).filter(Boolean),
      ...topCapitalRows.map((row) => row._id?.toString()).filter(Boolean)
    ])
  ]

  const products = productIds.length
    ? await GET_DB()
      .collection(productModel.PRODUCT_COLLECTION_NAME)
      .find({ _id: { $in: productIds.map((id) => new ObjectId(id)) } })
      .project({ name: 1, sku: 1 })
      .toArray()
    : []
  const productNameMap = new Map(
    products.map((item) => [
      item._id.toString(),
      { name: item.name || '', sku: item.sku || '' }
    ])
  )

  const exportByProduct = new Map()
  const importByProduct = new Map()
  for (const row of byProduct) {
    const id = row._id.productId?.toString()
    if (!id) continue
    const payload = {
      productId: id,
      productName: productNameMap.get(id)?.name || '',
      productSku: productNameMap.get(id)?.sku || '',
      totalValue: roundMoney(row.totalValue),
      totalQuantityBase: row.totalQuantityBase || 0,
      txnCount: row.txnCount || 0
    }
    if (row._id.type === 'export') exportByProduct.set(id, payload)
    if (row._id.type === 'import') importByProduct.set(id, payload)
  }

  const topImports = [...importByProduct.values()]
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 8)
  const topExports = [...exportByProduct.values()]
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 8)

  const topCapital = topCapitalRows.map((row) => {
    const id = row._id?.toString() || ''
    return {
      productId: id,
      productName: row.productName || productNameMap.get(id)?.name || '',
      productSku: row.productSku || productNameMap.get(id)?.sku || '',
      quantity: row.quantity || 0,
      costPrice: roundMoney(row.costPrice),
      stockValue: roundMoney(row.stockValue),
      exportValueInPeriod: exportByProduct.get(id)?.totalValue || 0
    }
  })

  const slowMoving = topCapital
    .filter((item) => item.exportValueInPeriod <= 0 && item.stockValue > 0)
    .slice(0, 8)

  const dayMap = new Map()
  for (const row of series) {
    const day = row._id.day
    if (!dayMap.has(day)) {
      dayMap.set(day, { date: day, importValue: 0, exportValue: 0 })
    }
    const point = dayMap.get(day)
    if (row._id.type === 'import') point.importValue = roundMoney(row.totalValue)
    if (row._id.type === 'export') point.exportValue = roundMoney(row.totalValue)
  }

  const toIso = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  return {
    from: toIso(from),
    to: toIso(to),
    dayCount,
    warehouseId: query.warehouseId || null,
    importValue: importStats.totalValue,
    exportValue: exportStats.totalValue,
    importQuantityBase: importStats.totalQuantityBase,
    exportQuantityBase: exportStats.totalQuantityBase,
    importTxnCount: importStats.txnCount,
    exportTxnCount: exportStats.txnCount,
    netFlowValue: roundMoney(importStats.totalValue - exportStats.totalValue),
    openingValue,
    closingValue,
    avgValue,
    turnoverTimes,
    daysOfInventory,
    zeroCostLines: valuation.zeroCostLines || 0,
    series: [...dayMap.values()],
    topImports,
    topExports,
    topCapital,
    slowMoving
  }
}

export const inventoryService = {
  importStock,
  exportStock,
  getStocks,
  getStockValuation,
  getFlowReport,
  getTransactions
}
