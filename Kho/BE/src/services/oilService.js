import { StatusCodes } from 'http-status-codes'
import { driverModel } from '~/models/driverModel'
import { oilModel } from '~/models/oilModel'
import ApiError from '~/utils/ApiError'
import { formatDocument } from '~/utils/formatters'

export const ENGINE_DUE_KM = 11000
export const ENGINE_PREPARE_KM = 11500
export const ENGINE_CHANGE_KM = 13000
export const ENGINE_DATE_KM = 12000
export const ENGINE_KM_PER_DAY = 280

const KINDS = ['may', 'cau', 'so']

const todayVietnam = () => {
  const shifted = new Date(Date.now() + 7 * 60 * 60 * 1000)
  return shifted.toISOString().slice(0, 10)
}

const isCalendarDate = (iso) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

const addDays = (iso, days) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!match) return null
  const ms = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) + days * 86400000
  const date = new Date(ms)
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${date.getUTCFullYear()}-${month}-${day}`
}

const finite = (value) => (Number.isFinite(value) ? value : null)

const engineReading = (currentKm, slot) => {
  const lastKm = finite(slot?.km)
  const lastDate = slot?.date || null
  const hasCurrent = currentKm != null
  const traveled = hasCurrent && lastKm != null ? currentKm - lastKm : null
  let status = 'missing-base'
  let label = 'Chưa có mốc'
  if (!hasCurrent) {
    status = 'missing-km'
    label = 'Chưa nhập km'
  } else if (traveled == null) {
    status = 'missing-base'
    label = 'Chưa có mốc'
  } else if (traveled <= ENGINE_DUE_KM) {
    status = 'wait'
    label = 'Chưa đến km'
  } else if (traveled <= ENGINE_PREPARE_KM) {
    status = 'prepare'
    label = 'Chuẩn bị'
  } else if (traveled <= ENGINE_CHANGE_KM) {
    status = 'change'
    label = 'Thay'
  } else {
    status = 'urgent'
    label = 'Thay gấp'
  }
  return {
    lastKm,
    lastDate,
    traveled,
    status,
    label,
    dueKm: lastKm == null ? null : lastKm + ENGINE_DUE_KM,
    dueDate: hasCurrent && lastDate ? addDays(lastDate, ENGINE_DATE_KM / ENGINE_KM_PER_DAY) : null
  }
}

const distanceReading = (currentKm, slot) => {
  const lastKm = finite(slot?.km)
  const lastDate = slot?.date || null
  return {
    lastKm,
    lastDate,
    traveled: currentKm != null && lastKm != null ? currentKm - lastKm : null
  }
}

const present = (driver, state) => {
  const currentKm = finite(state?.currentKm)
  return {
    driverId: driver._id.toString(),
    name: driver.name,
    plate: driver.plate || '',
    mooc: driver.mooc || '',
    currentKm,
    currentKmDate: state?.currentKmDate || null,
    may: engineReading(currentKm, state?.may),
    cau: distanceReading(currentKm, state?.cau),
    so: distanceReading(currentKm, state?.so)
  }
}

const requireDriver = async (driverId) => {
  const driver = await driverModel.findOneById(driverId)
  if (!driver) throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lái xe')
  return driver
}

const blankState = () => ({
  currentKm: null,
  currentKmDate: '',
  may: { km: null, date: '' },
  cau: { km: null, date: '' },
  so: { km: null, date: '' }
})

const getList = async () => {
  const [{ items }, states] = await Promise.all([
    driverModel.findMany({ _destroy: false }, { limit: 500, skip: 0, sort: { name: 1 } }),
    oilModel.listStates()
  ])
  const byDriver = new Map(states.map((state) => [state.driverId.toString(), state]))
  return {
    items: items.map((driver) => present(driver, byDriver.get(driver._id.toString()))),
    rule: {
      dueKm: ENGINE_DUE_KM,
      prepareKm: ENGINE_PREPARE_KM,
      changeKm: ENGINE_CHANGE_KM,
      dateKm: ENGINE_DATE_KM,
      kmPerDay: ENGINE_KM_PER_DAY
    }
  }
}

const getOne = async (driverId) => {
  const driver = await requireDriver(driverId)
  const [state, events] = await Promise.all([
    oilModel.stateOf(driverId),
    oilModel.listEvents(driverId)
  ])
  return {
    vehicle: present(driver, state),
    events: events.map((event) => formatDocument(event))
  }
}

const setKm = async (driverId, payload) => {
  const driver = await requireDriver(driverId)
  const current = (await oilModel.stateOf(driverId)) || blankState()
  const date = payload.date || todayVietnam()
  if (!isCalendarDate(date)) throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, 'Ngày nhập km không hợp lệ')
  const saved = await oilModel.saveState(driverId, {
    currentKm: payload.km,
    currentKmDate: date,
    may: current.may || { km: null, date: '' },
    cau: current.cau || { km: null, date: '' },
    so: current.so || { km: null, date: '' }
  })
  return present(driver, saved)
}

const recordChange = async (driverId, payload, actorName) => {
  const driver = await requireDriver(driverId)
  const date = payload.date || todayVietnam()
  if (!isCalendarDate(date)) throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, 'Ngày thay dầu không hợp lệ')
  if (!KINDS.includes(payload.kind)) throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, 'Chọn loại dầu')
  const current = (await oilModel.stateOf(driverId)) || blankState()
  const slot = { km: payload.km, date }
  const next = {
    currentKm: current.currentKm,
    currentKmDate: current.currentKmDate || '',
    may: current.may || { km: null, date: '' },
    cau: current.cau || { km: null, date: '' },
    so: current.so || { km: null, date: '' }
  }
  next[payload.kind] = slot
  if (next.currentKm == null || payload.km > next.currentKm) {
    next.currentKm = payload.km
    next.currentKmDate = date
  }
  await oilModel.addEvent({
    driverId,
    kind: payload.kind,
    km: payload.km,
    date,
    note: payload.note || '',
    createdBy: actorName || ''
  })
  const saved = await oilModel.saveState(driverId, next)
  return present(driver, saved)
}

export const oilService = {
  getList,
  getOne,
  setKm,
  recordChange
}
