/* eslint-disable no-console */
import { env } from '~/config/environment'

/** In-memory cache: address key → { lat, lng } | null (null = failed) */
const cache = new Map()

const cacheKey = (address) =>
  String(address || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

const withVietnamHint = (address) => {
  const raw = String(address || '').trim()
  if (!raw) return ''
  if (/việt nam|vietnam|\bvn\b/i.test(raw)) return raw
  return `${raw}, Việt Nam`
}

const geocodeGoogle = async (address) => {
  const key = env.GOOGLE_MAPS_API_KEY
  if (!key) return null

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', withVietnamHint(address))
  url.searchParams.set('region', 'vn')
  url.searchParams.set('language', 'vi')
  url.searchParams.set('key', key)

  const response = await fetch(url)
  if (!response.ok) return null
  const data = await response.json()
  if (data.status !== 'OK' || !data.results?.[0]?.geometry?.location) {
    if (data.status && data.status !== 'ZERO_RESULTS') {
      console.warn('[geocode] google', data.status, data.error_message || '')
    }
    return null
  }

  const { lat, lng } = data.results[0].geometry.location
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

/** Free fallback (OSM) — 1 req/s, chỉ khi không có Google key */
const geocodeNominatim = async (address) => {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', withVietnamHint(address))
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'vn')

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ASAKA-CRM/1.0 (trip-routing; mailto:crm@asaka.jp)',
      Accept: 'application/json'
    }
  })
  if (!response.ok) return null
  const data = await response.json()
  if (!Array.isArray(data) || !data[0]) return null

  const lat = Number(data[0].lat)
  const lng = Number(data[0].lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

/**
 * Geocode địa chỉ text → { lat, lng } hoặc null.
 * Ưu tiên Google (GOOGLE_MAPS_API_KEY), fallback Nominatim.
 */
export const geocodeAddress = async (address) => {
  const raw = String(address || '').trim()
  if (raw.length < 5) return null

  const key = cacheKey(raw)
  if (cache.has(key)) return cache.get(key)

  try {
    let result = null
    if (env.GOOGLE_MAPS_API_KEY) {
      result = await geocodeGoogle(raw)
    }
    if (!result) {
      result = await geocodeNominatim(raw)
    }
    cache.set(key, result)
    return result
  } catch (error) {
    console.warn('[geocode] failed', error?.message || error)
    cache.set(key, null)
    return null
  }
}

export const isGeocodeConfigured = () => Boolean(env.GOOGLE_MAPS_API_KEY)
