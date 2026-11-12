import { StatusCodes } from 'http-status-codes'
import { driverModel } from '~/models/driverModel'
import ApiError from '~/utils/ApiError'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { buildSearchFilter } from '~/utils/search'

const getList = async (query = {}) => {
  const { page, limit, skip } = parsePaginationQuery(query)
  const filter = { _destroy: false }
  const search = buildSearchFilter(['name', 'phone', 'plate', 'mooc'], query.q || '')
  if (search) Object.assign(filter, search)

  const result = await driverModel.findMany(filter, { limit, skip, sort: { name: 1 } })
  return buildPaginationResult({
    items: formatDocuments(result.items),
    total: result.total,
    limit,
    skip
  }, page)
}

const createNew = async (payload) => {
  const created = await driverModel.createNew({
    name: payload.name,
    phone: payload.phone || '',
    plate: payload.plate || '',
    mooc: payload.mooc || '',
    note: payload.note || ''
  })
  const driver = await driverModel.findOneById(created.insertedId)
  return formatDocument(driver)
}

const update = async (id, payload) => {
  const current = await driverModel.findOneById(id)
  if (!current) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lái xe')
  const updated = await driverModel.update(id, payload)
  if (!updated) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lái xe')
  return formatDocument(updated)
}

const deleteOne = async (id) => {
  const current = await driverModel.findOneById(id)
  if (!current) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lái xe')
  await driverModel.softDelete(id)
  return { id }
}

export const driverService = {
  getList,
  createNew,
  update,
  deleteOne
}
