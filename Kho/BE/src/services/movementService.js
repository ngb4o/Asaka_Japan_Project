import { ObjectId } from 'mongodb'
import { StatusCodes } from 'http-status-codes'
import { GET_CLIENT, GET_DB } from '~/config/mongodb'
import { driverModel } from '~/models/driverModel'
import { itemModel } from '~/models/itemModel'
import { movementModel } from '~/models/movementModel'
import { slipModel } from '~/models/slipModel'
import ApiError from '~/utils/ApiError'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { buildSearchFilter } from '~/utils/search'
import { OBJECT_ID_RULE } from '~/utils/validators'

export const roundQuantity = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

export const sumAllocatedQuantities = async (movementIds, exceptSlipId = null, session = null) => {
  const totals = new Map()
  if (!movementIds.length) return totals
  const objectIds = movementIds.map((id) => new ObjectId(id))
  const filter = { 'lines.movementId': { $in: objectIds } }
  if (exceptSlipId) filter._id = { $ne: new ObjectId(exceptSlipId) }
  const options = session ? { session } : {}
  const slips = await GET_DB().collection(slipModel.SLIP_COLLECTION_NAME).find(filter, options).toArray()
  const wanted = new Set(movementIds.map((id) => String(id)))
  for (const slip of slips) {
    for (const line of slip.lines || []) {
      const key = line.movementId.toString()
      if (!wanted.has(key)) continue
      totals.set(key, roundQuantity((totals.get(key) || 0) + Number(line.quantity || 0)))
    }
  }
  return totals
}

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
  if (query.unassigned === '1' || query.unassigned === 'true') {
    filter.type = 'out'
    if (query.includeSlip) {
      if (!OBJECT_ID_RULE.test(String(query.includeSlip))) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Id phiếu không hợp lệ')
      }
      filter.$or = [{ slipId: null }, { slipId: new ObjectId(String(query.includeSlip)) }]
    } else {
      filter.slipId = null
    }
  }

  const search = buildSearchFilter(['itemName', 'note', 'driverName', 'plate', 'mooc'], query.q || '')
  if (search && filter.$or) {
    filter.$and = [{ $or: filter.$or }, search]
    delete filter.$or
  } else if (search) {
    Object.assign(filter, search)
  }

  const result = await movementModel.findMany(filter, {
    limit,
    skip,
    sort: { createdAt: -1 }
  })

  let items = formatDocuments(result.items).map((item) => ({
    ...item,
    itemId: item.itemId?.toString()
  }))

  if (query.unassigned === '1' || query.unassigned === 'true') {
    const allocated = await sumAllocatedQuantities(items.map((item) => item.id), query.includeSlip || null)
    items = items.flatMap((item) => {
      const available = roundQuantity(item.quantity - (allocated.get(item.id) || 0))
      if (!(available > 0)) return []
      return [{ ...item, available }]
    })
  }

  return buildPaginationResult({
    items,
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
  const createdBy = String(payload.createdBy || '').trim()
  const driver = { driverId: '', driverName: '', plate: '', mooc: '' }

  if (type === 'out' && String(payload.driverId || '').trim()) {
    const driverId = String(payload.driverId).trim()
    if (!OBJECT_ID_RULE.test(driverId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Lái xe không hợp lệ')
    }
    const found = await driverModel.findOneById(driverId)
    if (!found) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lái xe')
    driver.driverId = found._id.toString()
    driver.driverName = found.name
    driver.plate = found.plate || ''
    driver.mooc = found.mooc || ''
  }
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
        ...driver,
        createdBy,
        balanceAfter
      }, session)

      movement = {
        _id: created.insertedId,
        itemId: current._id,
        itemName: current.name,
        type,
        quantity,
        note,
        ...driver,
        createdBy,
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

const actorName = (actor) => String(actor?.name || actor?.username || '').trim()

const recordOpening = async (item, actor) => {
  const quantity = roundQuantity(item.quantity)
  if (!(quantity > 0)) return null

  const created = await movementModel.createNew({
    itemId: item._id,
    itemName: item.name,
    type: 'in',
    quantity,
    note: 'Tồn đầu',
    createdBy: actorName(actor),
    balanceAfter: quantity
  })

  return created
}

export const movementService = {
  getList,
  record,
  recordOpening
}
