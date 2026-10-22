import { StatusCodes } from 'http-status-codes'
import { itemModel } from '~/models/itemModel'
import ApiError from '~/utils/ApiError'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { buildSearchFilter } from '~/utils/search'
import { removeStoredImage } from '~/utils/saveImage'

const getList = async (query = {}) => {
  const { page, limit, skip } = parsePaginationQuery(query)
  const filter = { _destroy: false }
  const search = buildSearchFilter(['name'], query.q || '')

  if (search) Object.assign(filter, search)

  const column = parseInt(query.column, 10)
  if (Number.isFinite(column) && column >= 0) filter.column = column

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
    summary: {
      totalItems: summary.totalItems,
      totalQuantity: summary.totalQuantity,
      columnCount: summary.columns.length
    }
  }
}

const createNew = async (payload) => {
  const created = await itemModel.createNew({
    name: payload.name,
    image: payload.image || '',
    quantity: payload.quantity,
    column: payload.column ?? null
  })

  const item = await itemModel.findOneById(created.insertedId)
  return formatDocument(item)
}

const update = async (id, payload) => {
  const current = await itemModel.findOneById(id)
  if (!current) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm')
  }

  const nextImage = payload.image
  if (nextImage && nextImage !== current.image) {
    await removeStoredImage(current.image)
  }

  const updated = await itemModel.update(id, payload)
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
