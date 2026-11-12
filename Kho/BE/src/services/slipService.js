import { ObjectId } from 'mongodb'
import { StatusCodes } from 'http-status-codes'
import { GET_CLIENT, GET_DB } from '~/config/mongodb'
import { movementModel } from '~/models/movementModel'
import { slipModel } from '~/models/slipModel'
import ApiError from '~/utils/ApiError'
import { formatDocument } from '~/utils/formatters'
import { OBJECT_ID_RULE } from '~/utils/validators'
import { roundQuantity, sumAllocatedQuantities } from '~/services/movementService'

const formatSlip = (doc) => {
  const formatted = formatDocument(doc)
  if (!formatted) return null
  formatted.status = formatted.status || 'draft'
  formatted.lines = (formatted.lines || []).map((line) => ({
    ...line,
    movementId: line.movementId?.toString?.() || String(line.movementId)
  }))
  return formatted
}

const buildLines = (ids, rows, payload, allocated) => {
  const notes = new Map(payload.lines.map((line) => [line.movementId, String(line.note || '').trim()]))
  const names = new Map(payload.lines.map((line) => [line.movementId, String(line.itemName || '').trim()]))
  const units = new Map(payload.lines.map((line) => [line.movementId, String(line.unit || '').trim()]))
  const quantities = new Map(payload.lines.map((line) => [line.movementId, roundQuantity(line.quantity)]))
  const byId = new Map(rows.map((row) => [row._id.toString(), row]))
  return ids.map((id) => {
    const row = byId.get(id)
    const quantity = quantities.get(id)
    const available = roundQuantity(row.quantity - (allocated.get(id) || 0))
    if (!(quantity > 0)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Số lượng phải lớn hơn 0')
    if (quantity > available) {
      throw new ApiError(StatusCodes.CONFLICT, `Số lượng ${row.itemName} chỉ còn ${available}`)
    }
    return {
      movementId: row._id,
      itemName: names.get(id) || row.itemName,
      unit: units.get(id) || '',
      quantity,
      note: notes.get(id) || ''
    }
  })
}

const syncClaims = async (movementIds, claimSlipId, session) => {
  if (!movementIds.length) return
  const movements = GET_DB().collection(movementModel.MOVEMENT_COLLECTION_NAME)
  const objectIds = movementIds.map((id) => new ObjectId(id))
  const rows = await movements.find({ _id: { $in: objectIds } }, { session }).toArray()
  const allocated = await sumAllocatedQuantities(movementIds, null, session)
  for (const row of rows) {
    const remaining = roundQuantity(row.quantity - (allocated.get(row._id.toString()) || 0))
    await movements.updateOne(
      { _id: row._id },
      { $set: { slipId: remaining > 0 ? null : claimSlipId } },
      { session }
    )
  }
}

const uniqueMovementIds = (payload) => {
  const ids = [...new Set(payload.lines.map((line) => line.movementId))]
  if (ids.length !== payload.lines.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Một vật tư đang được chọn hai lần')
  }
  return ids
}

const slipFields = (payload, createdBy) => ({
  kind: 'xuat-vat-tu',
  requester: payload.requester || '',
  driverId: payload.driverId || '',
  driverName: payload.driverName,
  plate: payload.plate || '',
  mooc: payload.mooc || '',
  km: Number(payload.km),
  status: 'draft',
  createdBy: createdBy || ''
})

const listDrafts = async () => {
  const rows = await GET_DB().collection(slipModel.SLIP_COLLECTION_NAME)
    .find({
      kind: 'xuat-vat-tu',
      $or: [{ status: 'draft' }, { status: { $exists: false } }]
    })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(30)
    .toArray()
  return rows.map(formatSlip)
}

const getExportSlip = async (id) => {
  if (!OBJECT_ID_RULE.test(String(id))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Id phiếu không hợp lệ')
  }
  const slip = await GET_DB().collection(slipModel.SLIP_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    kind: 'xuat-vat-tu'
  })
  if (!slip) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy phiếu')
  const formatted = formatSlip(slip)
  const allocated = await sumAllocatedQuantities(formatted.lines.map((line) => line.movementId), formatted.id)
  const movements = await GET_DB().collection(movementModel.MOVEMENT_COLLECTION_NAME)
    .find({ _id: { $in: formatted.lines.map((line) => new ObjectId(line.movementId)) } })
    .toArray()
  const byId = new Map(movements.map((row) => [row._id.toString(), row]))
  formatted.lines = formatted.lines.map((line) => {
    const movement = byId.get(line.movementId)
    const available = movement
      ? roundQuantity(movement.quantity - (allocated.get(line.movementId) || 0))
      : line.quantity
    return { ...line, available }
  })
  return formatted
}

const createExportSlip = async (payload, createdBy = '') => {
  const ids = uniqueMovementIds(payload)
  const objectIds = ids.map((id) => new ObjectId(id))
  const session = GET_CLIENT().startSession()
  let slipId = null

  try {
    await session.withTransaction(async () => {
      const movements = GET_DB().collection(movementModel.MOVEMENT_COLLECTION_NAME)
      const rows = await movements.find(
        { _id: { $in: objectIds }, type: 'out' },
        { session }
      ).toArray()

      if (rows.length !== objectIds.length) {
        throw new ApiError(StatusCodes.CONFLICT, 'Không tìm thấy vật tư đã xuất hoặc vật tư đã được gắn phiếu')
      }

      const allocated = await sumAllocatedQuantities(ids, null, session)
      const created = await slipModel.createNew({
        ...slipFields(payload, createdBy),
        lines: buildLines(ids, rows, payload, allocated)
      }, session)

      slipId = created.insertedId
      await syncClaims(ids, slipId, session)
    })
  } finally {
    await session.endSession()
  }

  return { id: slipId.toString() }
}

const updateExportSlip = async (id, payload) => {
  if (!OBJECT_ID_RULE.test(String(id))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Id phiếu không hợp lệ')
  }
  const ids = uniqueMovementIds(payload)
  const slipObjectId = new ObjectId(id)
  const session = GET_CLIENT().startSession()

  try {
    await session.withTransaction(async () => {
      const slips = GET_DB().collection(slipModel.SLIP_COLLECTION_NAME)
      const movements = GET_DB().collection(movementModel.MOVEMENT_COLLECTION_NAME)
      const slip = await slips.findOne({ _id: slipObjectId, kind: 'xuat-vat-tu' }, { session })
      if (!slip) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy phiếu')
      if (slip.status && slip.status !== 'draft') {
        throw new ApiError(StatusCodes.CONFLICT, 'Phiếu này không còn là bản nháp')
      }

      const previousIds = (slip.lines || []).map((line) => line.movementId.toString())

      const rows = await movements.find(
        { _id: { $in: ids.map((movementId) => new ObjectId(movementId)) }, type: 'out' },
        { session }
      ).toArray()
      if (rows.length !== ids.length) {
        throw new ApiError(StatusCodes.CONFLICT, 'Không tìm thấy vật tư đã xuất hoặc vật tư đã được gắn phiếu')
      }

      const allocated = await sumAllocatedQuantities(ids, id, session)
      const fields = slipFields(payload, slip.createdBy || '')
      await slips.updateOne(
        { _id: slipObjectId },
        {
          $set: {
            requester: fields.requester,
            driverId: fields.driverId,
            driverName: fields.driverName,
            plate: fields.plate,
            mooc: fields.mooc,
            km: fields.km,
            status: 'draft',
            lines: buildLines(ids, rows, payload, allocated),
            updatedAt: new Date()
          }
        },
        { session }
      )

      await syncClaims([...new Set([...ids, ...previousIds])], slipObjectId, session)
    })
  } finally {
    await session.endSession()
  }

  return { id }
}

const deleteExportSlip = async (id) => {
  if (!OBJECT_ID_RULE.test(String(id))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Id phiếu không hợp lệ')
  }
  const slipObjectId = new ObjectId(id)
  const session = GET_CLIENT().startSession()
  try {
    await session.withTransaction(async () => {
      const slips = GET_DB().collection(slipModel.SLIP_COLLECTION_NAME)
      const movements = GET_DB().collection(movementModel.MOVEMENT_COLLECTION_NAME)
      const slip = await slips.findOne({ _id: slipObjectId, kind: 'xuat-vat-tu' }, { session })
      if (!slip) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy bản nháp')
      const movementIds = [...new Set((slip.lines || []).map((line) => line.movementId.toString()))]
      await slips.deleteOne({ _id: slipObjectId }, { session })
      if (!movementIds.length) return
      const objectIds = movementIds.map((movementId) => new ObjectId(movementId))
      const rows = await movements.find({ _id: { $in: objectIds } }, { session }).toArray()
      const allocated = await sumAllocatedQuantities(movementIds, null, session)
      const holders = await slips.find(
        { 'lines.movementId': { $in: objectIds } },
        { session, projection: { lines: 1 } }
      ).toArray()
      for (const row of rows) {
        const key = row._id.toString()
        const remaining = roundQuantity(row.quantity - (allocated.get(key) || 0))
        const holder = remaining > 0 ? null : holders.find((item) => (item.lines || []).some((line) => line.movementId.toString() === key))
        await movements.updateOne(
          { _id: row._id },
          { $set: { slipId: holder ? holder._id : null } },
          { session }
        )
      }
    })
  } finally {
    await session.endSession()
  }
  return { id }
}

export const slipService = {
  listDrafts,
  getExportSlip,
  createExportSlip,
  updateExportSlip,
  deleteExportSlip
}
