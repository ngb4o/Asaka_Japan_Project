import { supplierModel } from '~/models/supplierModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { buildSearchFilter } from '~/utils/search.js'
import { normalizeOptionalLatLng, hasValidLatLng } from '~/utils/geo'
import { geocodeAddress } from '~/utils/geocode'

const resolveSupplierGeo = async (body, existing) => {
  const geo = normalizeOptionalLatLng(body)
  if (geo && hasValidLatLng(geo)) return geo

  const addressChanged = body.address !== undefined
  const address = String(
    addressChanged ? body.address : existing?.address || ''
  ).trim()
  const shouldGeocode =
    Boolean(address) &&
    !hasValidLatLng(geo) &&
    (addressChanged || !hasValidLatLng(existing))
  if (shouldGeocode) {
    const coords = await geocodeAddress(address)
    if (coords) return coords
  }

  if (geo !== undefined) return geo
  return undefined
}

const createNew = async (reqBody, userId) => {
  const geo = (await resolveSupplierGeo(reqBody, null)) || { lat: null, lng: null }
  const created = await supplierModel.createNew({
    name: reqBody.name,
    contactName: reqBody.contactName || '',
    phone: reqBody.phone,
    email: reqBody.email || '',
    address: reqBody.address || '',
    lat: geo.lat ?? null,
    lng: geo.lng ?? null,
    taxCode: reqBody.taxCode || '',
    status: reqBody.status || supplierModel.SUPPLIER_STATUS.ACTIVE,
    note: reqBody.note || '',
    createdBy: userId
  })

  const supplier = await supplierModel.findOneById(created.insertedId)
  return formatDocument(supplier)
}

const getList = async (query) => {
  const findQuery = {}
  if (query.status) findQuery.status = query.status

  const searchFilter = buildSearchFilter(
    ['name', 'contactName', 'phone', 'email', 'taxCode', 'address'],
    query.search
  )
  if (searchFilter) Object.assign(findQuery, searchFilter)

  const pagination = parsePaginationQuery(query)
  const result = await supplierModel.findMany(findQuery, {
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

const getDetails = async (supplierId) => {
  const supplier = await supplierModel.findOneById(supplierId)
  if (!supplier) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy nhà cung cấp!')
  }
  return formatDocument(supplier)
}

const update = async (supplierId, updateData) => {
  const supplier = await supplierModel.findOneById(supplierId)
  if (!supplier) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy nhà cung cấp!')
  }

  const dataToUpdate = {}
  if (updateData.name !== undefined) dataToUpdate.name = updateData.name
  if (updateData.contactName !== undefined) dataToUpdate.contactName = updateData.contactName
  if (updateData.phone !== undefined) dataToUpdate.phone = updateData.phone
  if (updateData.email !== undefined) dataToUpdate.email = updateData.email
  if (updateData.address !== undefined) dataToUpdate.address = updateData.address
  if (updateData.taxCode !== undefined) dataToUpdate.taxCode = updateData.taxCode
  if (updateData.status !== undefined) dataToUpdate.status = updateData.status
  if (updateData.note !== undefined) dataToUpdate.note = updateData.note

  const geo = await resolveSupplierGeo(updateData, supplier)
  if (geo !== undefined) {
    dataToUpdate.lat = geo.lat
    dataToUpdate.lng = geo.lng
  }

  await supplierModel.update(supplierId, dataToUpdate)
  return getDetails(supplierId)
}

const deleteOne = async (supplierId) => {
  const supplier = await supplierModel.findOneById(supplierId)
  if (!supplier) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy nhà cung cấp!')
  }
  await supplierModel.deleteOne(supplierId)
  return { message: 'Đã xóa nhà cung cấp!' }
}

export const supplierService = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne
}
