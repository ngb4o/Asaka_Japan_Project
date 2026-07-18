import { warehouseModel } from '~/models/warehouseModel'
import { warehouseStockModel } from '~/models/warehouseStockModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { slugify, formatDocument, formatDocuments } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'

const normalizeCode = (value) => slugify(value).replace(/-/g, '_').toUpperCase()

const createNew = async (reqBody, userId) => {
  const code = normalizeCode(reqBody.code || reqBody.name)

  const existingCode = await warehouseModel.findOneByCode(code)
  if (existingCode) {
    throw new ApiError(StatusCodes.CONFLICT, 'Warehouse code already exists!')
  }

  const created = await warehouseModel.createNew({
    name: reqBody.name,
    code,
    address: reqBody.address || '',
    note: reqBody.note || '',
    status: reqBody.status || warehouseModel.WAREHOUSE_STATUS.ACTIVE,
    createdBy: userId
  })

  const warehouse = await warehouseModel.findOneById(created.insertedId)
  return formatDocument(warehouse)
}

const getList = async (query) => {
  const findQuery = {}

  if (query.status) {
    findQuery.status = query.status
  }

  if (query.search) {
    findQuery.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { code: { $regex: query.search, $options: 'i' } },
      { address: { $regex: query.search, $options: 'i' } }
    ]
  }

  const pagination = parsePaginationQuery(query)

  const result = await warehouseModel.findMany(findQuery, {
    limit: pagination.limit,
    skip: pagination.skip
  })

  return buildPaginationResult(
    {
      items: formatDocuments(result.items),
      total: result.total,
      limit: pagination.limit,
      skip: pagination.skip
    },
    pagination.page
  )
}

const getDetails = async (warehouseId) => {
  const warehouse = await warehouseModel.findOneById(warehouseId)

  if (!warehouse) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Warehouse not found!')
  }

  return formatDocument(warehouse)
}

const update = async (warehouseId, updateData) => {
  const warehouse = await warehouseModel.findOneById(warehouseId)

  if (!warehouse) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Warehouse not found!')
  }

  const dataToUpdate = {}

  if (updateData.address !== undefined) dataToUpdate.address = updateData.address
  if (updateData.note !== undefined) dataToUpdate.note = updateData.note
  if (updateData.status !== undefined) dataToUpdate.status = updateData.status

  if (updateData.name !== undefined) {
    dataToUpdate.name = updateData.name
  }

  if (updateData.code !== undefined || updateData.name !== undefined) {
    const nextCode = normalizeCode(updateData.code || updateData.name || warehouse.name)
    const existingCode = await warehouseModel.findOneByCode(nextCode, warehouseId)

    if (existingCode) {
      throw new ApiError(StatusCodes.CONFLICT, 'Warehouse code already exists!')
    }

    dataToUpdate.code = nextCode
  }

  await warehouseModel.update(warehouseId, dataToUpdate)

  return await getDetails(warehouseId)
}

const deleteOne = async (warehouseId) => {
  const warehouse = await warehouseModel.findOneById(warehouseId)

  if (!warehouse) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Warehouse not found!')
  }

  const stockCount = await warehouseStockModel.countByWarehouseId(warehouseId)
  if (stockCount > 0) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'Cannot delete warehouse that still has stock!'
    )
  }

  await warehouseModel.deleteOne(warehouseId)

  return { message: 'Warehouse deleted successfully!' }
}

export const warehouseService = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne
}
