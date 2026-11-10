import { ObjectId } from 'mongodb'
import { StatusCodes } from 'http-status-codes'
import { GET_CLIENT, GET_DB } from '~/config/mongodb'
import { itemModel } from '~/models/itemModel'
import { movementModel } from '~/models/movementModel'
import ApiError from '~/utils/ApiError'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { buildSearchFilter } from '~/utils/search'
import { OBJECT_ID_RULE } from '~/utils/validators'

export const roundQuantity = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

const formatMovement = (doc) => {
  const formatted = formatDocument(doc)
  if (formatted?.itemId) formatted.itemId = formatted.itemId.toString()
  return formatted
}

const getList = async (query = {}) => {
  const { page, limit, skip } = parsePaginationQuery(query)
  const filter = {}

  if (query.itemId) {
    if (!OBJECT_ID_RULE.test(String(query.itemId))) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Id sản phẩm không hợp lệ')
    }
    filter.itemId = new ObjectId(query.itemId)
  }

  if (query.type === 'in' || query.type === 'out') filter.type = query.type

  const search = buildSearchFilter(['itemName', 'note'], query.q || '')
  if (search) Object.assign(filter, search)

  const result = await movementModel.findMany(filter, {
    limit,
    skip,
    sort: { createdAt: -1 }
  })

  return buildPaginationResult({
    items: formatDocuments(result.items).map((item) => ({
      ...item,
      itemId: item.itemId?.toString()
    })),
    total: result.total,
    limit,
    skip
  }, page)
}

const record = async (itemId, payload) => {
  const quantity = roundQuantity(payload.quantity)
  if (!(quantity > 0)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Số lượng phải lớn hơn 0')
  }

  const type = payload.type === 'out' ? 'out' : 'in'
  const note = String(payload.note || '').trim()
  const session = GET_CLIENT().startSession()
  let movement = null
  let item = null

  try {
    await session.withTransaction(async () => {
      const items = GET_DB().collection(itemModel.ITEM_COLLECTION_NAME)
      const current = await items.findOne(
        { _id: new ObjectId(itemId), _destroy: false },
        { session }
      )

      if (!current) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm')
      }

      const balanceAfter = roundQuantity(current.quantity + (type === 'in' ? quantity : -quantity))
      if (balanceAfter < 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Tồn kho không đủ để xuất')
      }

      await items.updateOne(
        { _id: current._id },
        { $set: { quantity: balanceAfter, updatedAt: new Date() } },
        { session }
      )

      const created = await movementModel.createNew({
        itemId: current._id,
        itemName: current.name,
        type,
        quantity,
        note,
        balanceAfter
      }, session)

      movement = {
        _id: created.insertedId,
        itemId: current._id,
        itemName: current.name,
        type,
        quantity,
        note,
        balanceAfter,
        createdAt: new Date()
      }
      item = { ...current, quantity: balanceAfter, updatedAt: new Date() }
    })
  } finally {
    await session.endSession()
  }

  return {
    movement: formatMovement(movement),
    item: formatDocument(item)
  }
}

const recordOpening = async (item) => {
  const quantity = roundQuantity(item.quantity)
  if (!(quantity > 0)) return null

  const created = await movementModel.createNew({
    itemId: item._id,
    itemName: item.name,
    type: 'in',
    quantity,
    note: 'Tồn đầu',
    balanceAfter: quantity
  })

  return created
}

export const movementService = {
  getList,
  record,
  recordOpening
}
