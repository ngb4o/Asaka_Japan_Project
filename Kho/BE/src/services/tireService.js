import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb'
import { GET_CLIENT } from '~/config/mongodb'
import { tireModel } from '~/models/tireModel'
import ApiError from '~/utils/ApiError'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { buildSearchFilter } from '~/utils/search'

const POSITIONS = new Set(['trai-ngoai', 'trai-trong', 'phai-ngoai', 'phai-trong', 'don'])
const SIDE_SLOTS = {
  trai: ['trai-ngoai', 'trai-trong'],
  phai: ['phai-ngoai', 'phai-trong']
}

const serialKeyOf = (serial) => String(serial || '').trim().replace(/\s+/g, '').toUpperCase()

const foldKey = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/gi, 'd')
  .replace(/[^a-z0-9]/gi, '')
  .toUpperCase()

const isMissingSerial = (serial) => foldKey(serial) === 'MATSO'

const keepsMissingKey = (serialKey) => {
  const key = String(serialKey || '')
  return key.startsWith('MATSO-') || foldKey(key) === 'MATSO'
}

const identityOf = (serial, currentKey = '') => {
  const text = String(serial || '').trim()
  if (!serialKeyOf(text)) return null
  if (isMissingSerial(text)) {
    return {
      serial: 'Mất số',
      serialKey: keepsMissingKey(currentKey) ? currentKey : `MATSO-${new ObjectId().toString()}`,
      missing: true
    }
  }
  return { serial: text, serialKey: serialKeyOf(text), missing: false }
}

const plateOf = (value) => String(value || '').trim().toUpperCase()

const sideLabel = (side) => (side === 'trai' ? 'trái' : 'phải')

const samePlace = (left, right) => (
  left?.kind === right.kind
  && left?.plate === right.plate
  && left?.axle === right.axle
  && left?.position === right.position
)

const eventType = (from, to) => {
  if (!from) return to.kind === 'kho' ? 'nhap' : 'gan'
  if (to.kind === 'kho') return 'thao'
  if (from.kind === 'kho') return 'gan'
  return 'chuyen'
}

const slotKey = (axle, position) => `${axle}|${position}`

const takenSlots = (tires, exceptId = null) => {
  const used = new Set()
  for (const tire of tires) {
    if (exceptId && String(tire._id) === String(exceptId)) continue
    if (tire.place?.kind === 'kho' || tire.place?.position === 'ngoai' || tire.place?.axle == null) continue
    used.add(slotKey(tire.place.axle, tire.place.position))
  }
  return used
}

const assignPosition = (tires, { axle, position, exceptId = null, reserved = new Set() }) => {
  if (POSITIONS.has(position)) {
    const key = slotKey(axle, position)
    if (reserved.has(key) || takenSlots(tires, exceptId).has(key)) {
      const occupant = tires.find((tire) => String(tire._id) !== String(exceptId) && slotKey(tire.place.axle, tire.place.position) === key)
      throw new ApiError(StatusCodes.CONFLICT, occupant ? `Ô này đang có lốp ${occupant.serial}` : 'Ô này đã có lốp')
    }
    return position
  }

  const slots = SIDE_SLOTS[position]
  if (!slots) throw new ApiError(StatusCodes.BAD_REQUEST, 'Chọn bên trái hoặc bên phải')
  const used = takenSlots(tires, exceptId)
  for (const key of reserved) used.add(key)

  if (exceptId) {
    const current = tires.find((tire) => String(tire._id) === String(exceptId))
    if (current && current.place?.axle === axle && slots.includes(current.place.position)) {
      return current.place.position
    }
  }

  const free = slots.find((slot) => !used.has(slotKey(axle, slot)))
  if (!free) {
    throw new ApiError(StatusCodes.CONFLICT, `Cầu ${axle} bên ${sideLabel(position)} đã đủ 2 lốp`)
  }
  return free
}

const normalizePlace = async (payload, exceptId = null) => {
  const kind = payload.kind
  if (kind === 'kho') {
    return { kind: 'kho', plate: '', axle: null, position: '' }
  }
  const plate = plateOf(payload.plate)
  const position = String(payload.position || payload.side || '').trim()
  if (!plate) throw new ApiError(StatusCodes.BAD_REQUEST, 'Nhập biển số')
  if (position === 'ngoai') {
    return { kind, plate, axle: null, position: 'ngoai' }
  }
  const axle = Number(payload.axle)
  if (!Number.isInteger(axle) || axle < 1 || axle > 12) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cầu từ 1 đến 12')
  }
  const sitting = await tireModel.findOnVehicle(kind, plate)
  const resolved = assignPosition(sitting, { axle, position, exceptId })
  return { kind, plate, axle, position: resolved }
}

const wearOf = (value, fallback = 100) => {
  if (value === undefined || value === null || value === '') return fallback
  const wear = Number(value)
  if (!Number.isInteger(wear) || wear < 0 || wear > 100) {
    throw new ApiError(StatusCodes.BAD_REQUEST, '% còn từ 0 đến 100')
  }
  return wear
}

const formatEvent = (doc) => {
  const formatted = formatDocument(doc)
  if (formatted?.tireId) formatted.tireId = formatted.tireId.toString()
  return formatted
}

const getList = async (query = {}) => {
  const { page, limit, skip } = parsePaginationQuery(query)
  const filter = { _destroy: false }
  if (query.kind === 'dau' || query.kind === 'mooc' || query.kind === 'kho') {
    filter['place.kind'] = query.kind
  }
  if (query.plate) filter['place.plate'] = plateOf(query.plate)
  const search = buildSearchFilter(['serial', 'brand', 'place.plate', 'note'], query.q || '')
  if (search) Object.assign(filter, search)

  const result = await tireModel.findMany(filter, { limit, skip, sort: { updatedAt: -1 } })
  return buildPaginationResult({
    items: formatDocuments(result.items),
    total: result.total,
    limit,
    skip
  }, page)
}

const getOne = async (id) => {
  const tire = await tireModel.findOneById(id)
  if (!tire) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lốp')
  const events = await tireModel.listEvents(id)
  return {
    tire: formatDocument(tire),
    events: events.map(formatEvent)
  }
}

const writeTire = async (line, actor, session) => {
  const created = await tireModel.createNew({
    serial: line.serial,
    serialKey: line.serialKey,
    brand: line.brand,
    wear: line.wear,
    place: line.place,
    note: line.note || ''
  }, session)
  await tireModel.addEvent({
    tireId: created.insertedId,
    serial: line.serial,
    type: eventType(null, line.place),
    from: null,
    to: line.place,
    note: line.note || '',
    wear: line.wear,
    createdBy: actor
  }, session)
  return created.insertedId
}

const createNew = async (payload, actor) => {
  const identity = identityOf(payload.serial)
  if (!identity) throw new ApiError(StatusCodes.BAD_REQUEST, 'Nhập số seri')
  if (!identity.missing) {
    const existing = await tireModel.findBySerialKey(identity.serialKey)
    if (existing) throw new ApiError(StatusCodes.CONFLICT, 'Số seri này đã có')
  }
  const { serial, serialKey } = identity

  const place = await normalizePlace(payload)
  const brand = String(payload.brand || '').trim()
  const wear = wearOf(payload.wear, 100)
  const note = String(payload.note || '').trim()
  const insertedId = await writeTire({ serial, serialKey, brand, wear, place, note }, actor, null)
  const tire = await tireModel.findOneById(insertedId)
  return formatDocument(tire)
}

const mountMany = async (payload, actor) => {
  const kind = payload.kind
  if (kind !== 'dau' && kind !== 'mooc') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Chọn đầu hoặc mooc')
  }
  const plate = plateOf(payload.plate)
  if (!plate) throw new ApiError(StatusCodes.BAD_REQUEST, 'Nhập biển số')
  const lines = Array.isArray(payload.lines) ? payload.lines : []
  if (!lines.length) throw new ApiError(StatusCodes.BAD_REQUEST, 'Thêm ít nhất một lốp')

  const prepared = []
  const seen = new Set()
  for (const line of lines) {
    const identity = identityOf(line.serial)
    if (!identity) throw new ApiError(StatusCodes.BAD_REQUEST, 'Nhập số seri')
    if (!identity.missing) {
      if (seen.has(identity.serialKey)) throw new ApiError(StatusCodes.CONFLICT, `Số seri ${identity.serial} bị trùng trong phiếu`)
      seen.add(identity.serialKey)
      const existing = await tireModel.findBySerialKey(identity.serialKey)
      if (existing) throw new ApiError(StatusCodes.CONFLICT, `Số seri ${identity.serial} đã có`)
    }
    const { serial, serialKey } = identity
    const axle = Number(line.axle)
    if (!Number.isInteger(axle) || axle < 1 || axle > 12) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Cầu từ 1 đến 12')
    }
    prepared.push({
      serial,
      serialKey,
      brand: String(line.brand || '').trim(),
      wear: wearOf(line.wear, 100),
      axle,
      side: String(line.side || '').trim(),
      note: ''
    })
  }

  const sitting = await tireModel.findOnVehicle(kind, plate)
  const reserved = new Set()
  for (const line of prepared) {
    const position = assignPosition(sitting, {
      axle: line.axle,
      position: line.side,
      reserved
    })
    line.place = { kind, plate, axle: line.axle, position }
    reserved.add(slotKey(line.axle, position))
  }

  const session = GET_CLIENT().startSession()
  const ids = []
  try {
    await session.withTransaction(async () => {
      ids.length = 0
      for (const line of prepared) {
        ids.push(await writeTire(line, actor, session))
      }
    })
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(StatusCodes.CONFLICT, 'Số seri này đã có')
    throw error
  } finally {
    await session.endSession()
  }

  const tires = []
  for (const id of ids) {
    const tire = await tireModel.findOneById(id)
    if (tire) tires.push(formatDocument(tire))
  }
  return tires
}

const move = async (id, payload, actor) => {
  const current = await tireModel.findOneById(id)
  if (!current) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lốp')
  const place = await normalizePlace(payload, id)
  const brand = payload.brand === undefined ? (current.brand || '') : String(payload.brand || '').trim()
  const wear = wearOf(payload.wear, current.wear ?? 100)
  const note = String(payload.note || '').trim()
  const placeSame = samePlace(current.place, place)
  const detailSame = brand === (current.brand || '') && wear === (current.wear ?? 100) && (note || current.note || '') === (current.note || '')
  if (placeSame && detailSame) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Lốp đang ở chỗ này')
  }
  const updated = await tireModel.updatePlace(id, {
    place,
    brand,
    wear,
    note: note || current.note || ''
  })
  if (!updated) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lốp')
  if (!placeSame) {
    await tireModel.addEvent({
      tireId: id,
      serial: current.serial,
      type: eventType(current.place, place),
      from: current.place,
      to: place,
      note,
      wear,
      createdBy: actor
    })
  }
  return formatDocument(updated)
}

const correct = async (id, payload) => {
  const current = await tireModel.findOneById(id)
  if (!current) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lốp')
  const identity = identityOf(payload.serial, current.serialKey)
  if (!identity) throw new ApiError(StatusCodes.BAD_REQUEST, 'Nhập số seri')
  if (!identity.missing) {
    const existing = await tireModel.findBySerialKey(identity.serialKey)
    if (existing && String(existing._id) !== String(id)) {
      throw new ApiError(StatusCodes.CONFLICT, 'Số seri này đã có')
    }
  }
  const { serial, serialKey } = identity
  const brand = String(payload.brand || '').trim()
  const wear = wearOf(payload.wear, current.wear ?? 100)
  const updated = await tireModel.updatePlace(id, { serial, serialKey, brand, wear })
  if (!updated) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lốp')
  if (serial !== current.serial) await tireModel.renameEvents(id, serial)
  return formatDocument(updated)
}

export const tireService = {
  getList,
  getOne,
  createNew,
  mountMany,
  move,
  correct
}
