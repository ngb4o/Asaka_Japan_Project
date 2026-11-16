import { StatusCodes } from 'http-status-codes'
import { itemModel } from '~/models/itemModel'
import ApiError from '~/utils/ApiError'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { buildSearchFilter } from '~/utils/search'
import { removeStoredImage } from '~/utils/saveImage'
import { movementService, roundQuantity } from '~/services/movementService'
import { unitUtil } from '~/utils/unit'

const parseQtyBound = (value) => {
  if (value == null || value === '') return null
  const number = Number(String(value).replace(',', '.'))
  if (!Number.isFinite(number) || number < 0) return null
  return roundQuantity(number)
}

const getList = async (query = {}) => {
  const { page, limit, skip } = parsePaginationQuery(query)
  const filter = { _destroy: false }
  const search = buildSearchFilter(['name'], query.q || '')

  if (search) Object.assign(filter, search)

  if (query.column === 'none') {
    filter.column = null
  } else {
    const column = parseInt(query.column, 10)
    if (Number.isFinite(column) && column >= 0) filter.column = column
  }

  const quantity = {}
  if (query.stock === 'in') quantity.$gt = 0
  if (query.stock === 'out') quantity.$lte = 0

  let qtyMin = parseQtyBound(query.qtyMin)
  let qtyMax = parseQtyBound(query.qtyMax)
  if (qtyMin != null && qtyMax != null && qtyMin > qtyMax) {
    const swap = qtyMin
    qtyMin = qtyMax
    qtyMax = swap
  }
  if (qtyMin != null) quantity.$gte = qtyMin
  if (qtyMax != null) quantity.$lte = quantity.$lte == null ? qtyMax : Math.min(quantity.$lte, qtyMax)
  if (Object.keys(quantity).length) filter.quantity = quantity

  const units = unitUtil.unitMatchValues(query.unit)
  if (units.length) filter.unit = { $in: units }

  const result = await itemModel.findMany(filter, {
    limit,
    skip,
    sort: { column: 1, name: 1 }
  })
  const summary = await itemModel.summarize()

  return {
    ...buildPaginationResult({
      items: formatDocuments(result.items),
      total: result.total,
      limit,
      skip
    }, page),
    columns: summary.columns,
    units: summary.units,
    summary: {
      totalItems: summary.totalItems,
      totalQuantity: summary.totalQuantity,
      columnCount: summary.columns.length
    }
  }
}

const createNew = async (payload, actor) => {
  const created = await itemModel.createNew({
    name: payload.name,
    image: payload.image || '',
    quantity: payload.quantity,
    unit: unitUtil.canonicalUnit(payload.unit),
    column: payload.column ?? null
  })

  const item = await itemModel.findOneById(created.insertedId)
  await movementService.recordOpening(item, actor)
  return formatDocument(item)
}

const update = async (id, payload, actor) => {
  const current = await itemModel.findOneById(id)
  if (!current) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm')
  }

  const nextImage = payload.image
  if (nextImage && nextImage !== current.image) {
    await removeStoredImage(current.image)
  }

  const nextPayload = { ...payload }
  if (nextPayload.unit != null) nextPayload.unit = unitUtil.canonicalUnit(nextPayload.unit)
  if (nextPayload.quantity != null) {
    const nextQuantity = roundQuantity(nextPayload.quantity)
    const currentQuantity = roundQuantity(current.quantity)
    if (nextQuantity !== currentQuantity) {
      await movementService.record(id, {
        type: nextQuantity > currentQuantity ? 'in' : 'out',
        quantity: roundQuantity(Math.abs(nextQuantity - currentQuantity)),
        note: 'Điều chỉnh tồn',
        createdBy: actor?.name || actor?.username || ''
      })
    }
    delete nextPayload.quantity
  }

  if (!Object.keys(nextPayload).length) {
    const latest = await itemModel.findOneById(id)
    return formatDocument(latest)
  }

  const updated = await itemModel.update(id, nextPayload)
  if (!updated) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm')
  }

  return formatDocument(updated)
}

const deleteOne = async (id) => {
  const current = await itemModel.findOneById(id)
  if (!current) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm')
  }

  await itemModel.softDelete(id)
  await removeStoredImage(current.image)

  return { id }
}

export const itemService = {
  getList,
  createNew,
  update,
  deleteOne
}
