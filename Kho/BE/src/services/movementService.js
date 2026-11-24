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

const DATE_RULE = /^(\d{4})-(\d{2})-(\d{2})$/

const parseCalendarDate = (value) => {
  const text = String(value || '').trim()
  if (!text) return null
  const match = DATE_RULE.exec(text)
  if (!match) throw new ApiError(StatusCodes.BAD_REQUEST, 'Ngày lọc không hợp lệ')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Ngày lọc không hợp lệ')
  }
  return { year, month, day, key: text }
}

const startOfVietnamDay = ({ year, month, day }) => new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0))

const endOfVietnamDay = ({ year, month, day }) => new Date(Date.UTC(year, month - 1, day, 16, 59, 59, 999))

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

  const fromDate = parseCalendarDate(query.from)
  const toDate = parseCalendarDate(query.to)
  if (fromDate || toDate) {
    const [earlier, later] = fromDate && toDate && fromDate.key > toDate.key
      ? [toDate, fromDate]
      : [fromDate, toDate]
    filter.createdAt = {}
    if (earlier) filter.createdAt.$gte = startOfVietnamDay(earlier)
    if (later) filter.createdAt.$lte = endOfVietnamDay(later)
  }
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
  const driver = await resolveDriver(type, payload.driverId)
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

const signedQuantity = (type, quantity) => roundQuantity(type === 'in' ? quantity : -quantity)

const allocatedOf = async (movementId, session = null) => {
  const totals = await sumAllocatedQuantities([movementId], null, session)
  return roundQuantity(totals.get(movementId) || 0)
}

const resolveDriver = async (type, driverId) => {
  const driver = { driverId: '', driverName: '', plate: '', mooc: '' }
  if (type !== 'out' || !String(driverId || '').trim()) return driver
  const id = String(driverId).trim()
  if (!OBJECT_ID_RULE.test(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Lái xe không hợp lệ')
  }
  const found = await driverModel.findOneById(id)
  if (!found) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lái xe')
  driver.driverId = found._id.toString()
  driver.driverName = found.name
  driver.plate = found.plate || ''
  driver.mooc = found.mooc || ''
  return driver
}

const openingStockOf = async (itemId, session) => {
  const items = GET_DB().collection(itemModel.ITEM_COLLECTION_NAME)
  const item = await items.findOne({ _id: new ObjectId(itemId), _destroy: false }, { session })
  if (!item) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm')
  const rows = await movementModel.listByItemChrono(itemId, session)
  const moved = rows.reduce((total, row) => roundQuantity(total + signedQuantity(row.type, row.quantity)), 0)
  return { item, opening: roundQuantity((item.quantity || 0) - moved) }
}

const rebuildItemBalances = async (itemId, session, opening) => {
  const rows = await movementModel.listByItemChrono(itemId, session)
  let balance = roundQuantity(opening)
  for (const row of rows) {
    balance = roundQuantity(balance + signedQuantity(row.type, row.quantity))
    if (balance < 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Tồn kho không đủ sau khi sửa phiếu')
    }
    if (roundQuantity(row.balanceAfter) !== balance) {
      await movementModel.updateById(row._id, { balanceAfter: balance }, session)
      row.balanceAfter = balance
    }
  }
  const items = GET_DB().collection(itemModel.ITEM_COLLECTION_NAME)
  const item = await items.findOne({ _id: new ObjectId(itemId), _destroy: false }, { session })
  if (!item) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm')
  await items.updateOne(
    { _id: item._id },
    { $set: { quantity: balance, updatedAt: new Date() } },
    { session }
  )
  return { item: { ...item, quantity: balance, updatedAt: new Date() }, rows, balance }
}

const getOne = async (id) => {
  const movement = await movementModel.findOneById(id)
  if (!movement) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy phiếu')
  const item = await itemModel.findOneById(movement.itemId)
  if (!item) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm')
  return {
    movement: formatMovement(movement),
    item: formatDocument(item),
    allocated: await allocatedOf(id)
  }
}

const update = async (id, payload) => {
  const current = await movementModel.findOneById(id)
  if (!current) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy phiếu')

  const quantity = roundQuantity(payload.quantity)
  if (!(quantity > 0)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Số lượng phải lớn hơn 0')
  const type = payload.type === 'out' ? 'out' : 'in'
  const allocated = await allocatedOf(id)
  if (allocated > 0) {
    if (type !== 'out') {
      throw new ApiError(StatusCodes.CONFLICT, 'Phiếu đã nằm trên phiếu xuất vật tư, không đổi sang nhập')
    }
    if (quantity < allocated) {
      throw new ApiError(StatusCodes.CONFLICT, `Phiếu đã dùng ${allocated} trên phiếu xuất vật tư`)
    }
  }

  const driver = await resolveDriver(type, payload.driverId)
  const note = String(payload.note || '').trim()
  const session = GET_CLIENT().startSession()
  let movement = null
  let item = null

  try {
    await session.withTransaction(async () => {
      const latest = await movementModel.findOneById(id, session)
      if (!latest) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy phiếu')
      const { opening } = await openingStockOf(latest.itemId, session)
      await movementModel.updateById(id, {
        type,
        quantity,
        note,
        ...driver
      }, session)
      const rebuilt = await rebuildItemBalances(latest.itemId, session, opening)
      item = rebuilt.item
      movement = rebuilt.rows.find((row) => String(row._id) === String(id)) || { ...latest, type, quantity, note, ...driver }
    })
  } finally {
    await session.endSession()
  }

  return {
    movement: formatMovement(movement),
    item: formatDocument(item)
  }
}

const remove = async (id) => {
  const current = await movementModel.findOneById(id)
  if (!current) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy phiếu')
  const allocated = await allocatedOf(id)
  if (allocated > 0) {
    throw new ApiError(StatusCodes.CONFLICT, 'Phiếu đã nằm trên phiếu xuất vật tư, không xóa được')
  }

  const session = GET_CLIENT().startSession()
  let item = null

  try {
    await session.withTransaction(async () => {
      const latest = await movementModel.findOneById(id, session)
      if (!latest) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy phiếu')
      const stillAllocated = await allocatedOf(id, session)
      if (stillAllocated > 0) {
        throw new ApiError(StatusCodes.CONFLICT, 'Phiếu đã nằm trên phiếu xuất vật tư, không xóa được')
      }
      const { opening } = await openingStockOf(latest.itemId, session)
      await movementModel.deleteById(id, session)
      const rebuilt = await rebuildItemBalances(latest.itemId, session, opening)
      item = rebuilt.item
    })
  } finally {
    await session.endSession()
  }

  return {
    id,
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
  getOne,
  record,
  update,
  remove,
  recordOpening
}
