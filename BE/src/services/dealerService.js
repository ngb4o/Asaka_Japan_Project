import { dealerModel } from '~/models/dealerModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { telegramNotifyService } from '~/services/telegram/telegramNotifyService'

const createNew = async (reqBody, userId) => {
  const created = await dealerModel.createNew({
    name: reqBody.name,
    contactName: reqBody.contactName || '',
    phone: reqBody.phone,
    email: reqBody.email || '',
    address: reqBody.address || '',
    region: reqBody.region || '',
    tier: reqBody.tier || dealerModel.DEALER_TIER.STANDARD,
    discountPercent: reqBody.discountPercent ?? 0,
    status: reqBody.status || dealerModel.DEALER_STATUS.PENDING,
    note: reqBody.note || '',
    leadId: reqBody.leadId || null,
    createdBy: userId
  })

  const dealer = await dealerModel.findOneById(created.insertedId)
  const formatted = formatDocument(dealer)
  telegramNotifyService.onDealerCreated(formatted)
  return formatted
}

const getList = async (query) => {
  const findQuery = {}

  if (query.status) findQuery.status = query.status
  if (query.region) findQuery.region = query.region

  if (query.search) {
    findQuery.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { contactName: { $regex: query.search, $options: 'i' } },
      { phone: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
      { region: { $regex: query.search, $options: 'i' } }
    ]
  }

  const pagination = parsePaginationQuery(query)
  const result = await dealerModel.findMany(findQuery, {
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

const getDetails = async (dealerId) => {
  const dealer = await dealerModel.findOneById(dealerId)

  if (!dealer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đại lý!')
  }

  return formatDocument(dealer)
}

const update = async (dealerId, updateData) => {
  const dealer = await dealerModel.findOneById(dealerId)

  if (!dealer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đại lý!')
  }

  const dataToUpdate = {}

  if (updateData.name !== undefined) dataToUpdate.name = updateData.name
  if (updateData.contactName !== undefined) dataToUpdate.contactName = updateData.contactName
  if (updateData.phone !== undefined) dataToUpdate.phone = updateData.phone
  if (updateData.email !== undefined) dataToUpdate.email = updateData.email
  if (updateData.address !== undefined) dataToUpdate.address = updateData.address
  if (updateData.region !== undefined) dataToUpdate.region = updateData.region
  if (updateData.tier !== undefined) dataToUpdate.tier = updateData.tier
  if (updateData.discountPercent !== undefined) {
    dataToUpdate.discountPercent = updateData.discountPercent
  }
  if (updateData.status !== undefined) dataToUpdate.status = updateData.status
  if (updateData.note !== undefined) dataToUpdate.note = updateData.note

  await dealerModel.update(dealerId, dataToUpdate)

  const formatted = await getDetails(dealerId)
  telegramNotifyService.onDealerStatusChanged(dealer.status, formatted)
  return formatted
}

const deleteOne = async (dealerId) => {
  const dealer = await dealerModel.findOneById(dealerId)

  if (!dealer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đại lý!')
  }

  await dealerModel.deleteOne(dealerId)

  return { message: 'Đã xóa đại lý thành công!' }
}

export const dealerService = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne
}
