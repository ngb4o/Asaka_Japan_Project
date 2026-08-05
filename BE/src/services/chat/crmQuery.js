import { ObjectId } from 'mongodb'
import { StatusCodes } from 'http-status-codes'
import { GET_DB } from '~/config/mongodb'
import ApiError from '~/utils/ApiError'
import { CRM_SCHEMA } from '~/services/chat/crmSchema'

const ALLOWED_COLLECTIONS = new Set(Object.keys(CRM_SCHEMA))

const BLOCKED_AGG_STAGES = new Set([
  '$out',
  '$merge',
  '$function',
  '$accumulator',
  '$where',
  '$lookup',
  '$unionWith',
  '$currentOp',
  '$listSessions',
  '$planCacheStats',
  '$indexStats',
  '$collStats',
  '$changeStream'
])

const MAX_LIMIT = 50
const MAX_PIPELINE = 8
const MAX_JSON_CHARS = 8000

const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const endOfDay = (date) => {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

const resolvePresetRange = (preset) => {
  const key = String(preset || '').trim()
  if (!key) return null
  const now = new Date()
  let from = startOfDay(now)
  const to = endOfDay(now)

  switch (key) {
  case 'today':
    break
  case 'thisWeek': {
    const day = from.getDay()
    const offset = day === 0 ? 6 : day - 1
    from = startOfDay(
      new Date(from.getFullYear(), from.getMonth(), from.getDate() - offset)
    )
    break
  }
  case 'lastWeek': {
    const day = from.getDay()
    const offset = day === 0 ? 6 : day - 1
    const thisMonday = startOfDay(
      new Date(from.getFullYear(), from.getMonth(), from.getDate() - offset)
    )
    return {
      from: startOfDay(new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000)),
      to: endOfDay(new Date(thisMonday.getTime() - 1))
    }
  }
  case 'thisMonth':
    from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1))
    break
  case 'lastMonth':
    return {
      from: startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0))
    }
  default:
    return null
  }
  return { from, to }
}

const isObjectIdString = (value) =>
  typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value)

/** Convert 24-hex strings under *_id / id keys to ObjectId; ISO dates under *At / date / from/to. */
const hydrateValue = (key, value) => {
  if (value == null) return value
  if (value instanceof Date || value instanceof ObjectId) return value
  if (Array.isArray(value)) return value.map((item) => hydrateValue(key, item))
  if (typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = hydrateValue(k, v)
    }
    return out
  }
  if (isObjectIdString(value) && /(^_id$|Id$)/.test(String(key))) {
    return new ObjectId(value)
  }
  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}/.test(value) &&
    /(At$|^date$|^from$|^to$|Date$)/.test(String(key))
  ) {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d
  }
  return value
}

const assertSafeObject = (value, path = 'filter') => {
  if (value == null) return
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeObject(item, `${path}[${index}]`))
    return
  }
  if (typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    if (key === '$where' || key === '$function' || key === '$accumulator') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Không cho phép toán tử ${key} trong ${path}.`
      )
    }
    assertSafeObject(child, `${path}.${key}`)
  }
}

const assertSafePipeline = (pipeline) => {
  if (!Array.isArray(pipeline)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'pipeline phải là mảng.')
  }
  if (pipeline.length > MAX_PIPELINE) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `pipeline tối đa ${MAX_PIPELINE} stage.`
    )
  }
  for (const stage of pipeline) {
    if (!stage || typeof stage !== 'object') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Stage aggregate không hợp lệ.')
    }
    const keys = Object.keys(stage)
    for (const key of keys) {
      if (BLOCKED_AGG_STAGES.has(key)) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Không cho phép stage ${key} (chỉ đọc dữ liệu CRM).`
        )
      }
    }
    assertSafeObject(stage, 'pipeline')
  }
}

const serializeDoc = (doc) => {
  if (doc == null) return doc
  if (doc instanceof ObjectId) return doc.toString()
  if (doc instanceof Date) return doc.toISOString()
  if (Array.isArray(doc)) return doc.map(serializeDoc)
  if (typeof doc === 'object') {
    const out = {}
    for (const [key, value] of Object.entries(doc)) {
      // Strip secrets if any slip through
      if (['password', 'passwordHash', 'token', 'refreshToken'].includes(key)) {
        continue
      }
      out[key] = serializeDoc(value)
    }
    return out
  }
  return doc
}

const trimPayload = (payload) => {
  const text = JSON.stringify(payload)
  if (text.length <= MAX_JSON_CHARS) return payload
  const items = Array.isArray(payload.items) ? payload.items : null
  if (items) {
    let kept = items.length
    while (kept > 1) {
      kept = Math.ceil(kept / 2)
      const next = {
        ...payload,
        items: items.slice(0, kept),
        truncated: true,
        shown: kept,
        note: `Kết quả cắt còn ${kept}/${items.length} dòng vì quá dài. Hỏi cụ thể hơn hoặc dùng aggregate/count.`
      }
      if (JSON.stringify(next).length <= MAX_JSON_CHARS) return next
    }
  }
  return {
    ...payload,
    items: undefined,
    truncated: true,
    note: 'Kết quả quá lớn — dùng operation=count hoặc aggregate $group thay vì list đầy đủ.',
    preview: text.slice(0, 1200)
  }
}

/**
 * Safe read-only CRM Mongo query for the chatbot.
 * @param {{
 *  collection: string,
 *  operation?: 'find'|'aggregate'|'count',
 *  filter?: object,
 *  projection?: object,
 *  sort?: object,
 *  pipeline?: object[],
 *  limit?: number,
 *  preset?: string,
 *  dateField?: string
 * }} args
 */
export const runCrmQuery = async (args = {}) => {
  const collectionName = String(args.collection || '').trim()
  if (!ALLOWED_COLLECTIONS.has(collectionName)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Collection không được phép. Cho phép: ${[...ALLOWED_COLLECTIONS].join(', ')}`
    )
  }

  const operation = String(args.operation || 'find').trim()
  if (!['find', 'aggregate', 'count'].includes(operation)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'operation phải là find | aggregate | count.'
    )
  }

  let filter =
    args.filter && typeof args.filter === 'object' && !Array.isArray(args.filter)
      ? { ...args.filter }
      : {}

  // Soft-deleted docs default hide
  if (filter._destroy === undefined) {
    filter._destroy = false
  }

  const range = resolvePresetRange(args.preset)
  if (range) {
    const dateField = String(args.dateField || 'createdAt')
    filter[dateField] = {
      ...(filter[dateField] && typeof filter[dateField] === 'object'
        ? filter[dateField]
        : {}),
      $gte: range.from,
      $lte: range.to
    }
  }

  filter = hydrateValue('filter', filter)
  assertSafeObject(filter, 'filter')

  const limit = Math.min(
    Math.max(1, Number(args.limit) || (operation === 'find' ? 20 : 40)),
    MAX_LIMIT
  )

  const col = GET_DB().collection(collectionName)

  if (operation === 'count') {
    const total = await col.countDocuments(filter)
    return {
      collection: collectionName,
      operation,
      filter,
      total,
      preset: args.preset || undefined
    }
  }

  if (operation === 'aggregate') {
    const userPipeline = Array.isArray(args.pipeline) ? args.pipeline : []
    assertSafePipeline(userPipeline)
    const pipeline = [{ $match: filter }, ...userPipeline]
    // Cap rows unless pipeline already ends with $count/$group only one doc
    const last = userPipeline[userPipeline.length - 1]
    const endsWithCount =
      last && typeof last === 'object' && ('$count' in last || '$group' in last)
    if (!endsWithCount) {
      pipeline.push({ $limit: limit })
    }
    const rows = await col.aggregate(pipeline).toArray()
    return trimPayload({
      collection: collectionName,
      operation,
      preset: args.preset || undefined,
      total: rows.length,
      shown: rows.length,
      items: rows.map(serializeDoc)
    })
  }

  // find
  let cursor = col.find(filter)
  if (args.projection && typeof args.projection === 'object') {
    cursor = cursor.project(hydrateValue('projection', args.projection))
  }
  if (args.sort && typeof args.sort === 'object') {
    cursor = cursor.sort(hydrateValue('sort', args.sort))
  } else {
    cursor = cursor.sort({ createdAt: -1 })
  }

  const total = await col.countDocuments(filter)
  const rows = await cursor.limit(limit).toArray()
  const items = rows.map(serializeDoc)
  const sortKeys =
    args.sort && typeof args.sort === 'object' ? Object.keys(args.sort) : []
  const top = items[0] || null

  return trimPayload({
    collection: collectionName,
    operation: 'find',
    preset: args.preset || undefined,
    total,
    shown: items.length,
    truncated: total > items.length,
    topItem: top,
    rankingNote:
      top && sortKeys.length
        ? `Phần tử đầu (topItem) là cao/thấp nhất theo sort ${sortKeys.join(',')}.`
        : undefined,
    items
  })
}

export const CRM_QUERY_COLLECTIONS = [...ALLOWED_COLLECTIONS]
