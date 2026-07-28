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
import { telegramNotifyService } from '~/services/telegram/telegramNotifyService'

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
    note = ''
  } = reqBody

  await ensureWarehouseExists(warehouseId)
  const product = await ensureProductExists(productId)

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

  return await runInTransaction(async (session) => {
    let stockResult

    if (type === inventoryTransactionModel.TRANSACTION_TYPE.IMPORT) {
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
      balanceAfter
    }
  })
}

const importStock = async (reqBody, userId) => {
  const result = await createTransaction(
    inventoryTransactionModel.TRANSACTION_TYPE.IMPORT,
    reqBody,
    userId
  )
  telegramNotifyService.onStockChanged({
    productId: reqBody.productId,
    warehouseId: reqBody.warehouseId,
    quantity: result.balanceAfter
  })
  return result.formatted
}

const exportStock = async (reqBody, userId) => {
  const result = await createTransaction(
    inventoryTransactionModel.TRANSACTION_TYPE.EXPORT,
    reqBody,
    userId
  )
  telegramNotifyService.onStockChanged({
    productId: reqBody.productId,
    warehouseId: reqBody.warehouseId,
    quantity: result.balanceAfter
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
        $or: [
          { name: { $regex: query.search, $options: 'i' } },
          { sku: { $regex: query.search, $options: 'i' } }
        ]
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
        unitsPerCase: toUnitsPerCase(item.unitsPerCase)
      }
    ])
  )

  const items = formatDocuments(result.items).map((item) => {
    const product = productMap.get(item.productId)

    return {
      ...item,
      warehouseName: warehouseMap.get(item.warehouseId) || '',
      productName: product?.name || '',
      productSku: product?.sku || '',
      productUnit: product?.unit || 'chai',
      unitsPerCase: product?.unitsPerCase || 1
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
        unitsPerCase: toUnitsPerCase(item.unitsPerCase)
      }
    ])
  )

  const items = formatDocuments(result.items).map((item) => {
    const product = productMap.get(item.productId)

    return {
      ...item,
      warehouseName: warehouseMap.get(item.warehouseId) || '',
      productName: product?.name || '',
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

export const inventoryService = {
  importStock,
  exportStock,
  getStocks,
  getTransactions
}
