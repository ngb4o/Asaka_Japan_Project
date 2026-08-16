/**
 * Optional lat/lng for master data (dealer, warehouse, supplier).
 * - undefined → field not provided (skip update)
 * - { lat: null, lng: null } → clear GPS
 * - { lat, lng } → set coordinates
 */
export const normalizeOptionalLatLng = (body = {}) => {
  if (!Object.prototype.hasOwnProperty.call(body, 'lat') &&
      !Object.prototype.hasOwnProperty.call(body, 'lng')) {
    return undefined
  }

  const latRaw = body.lat
  const lngRaw = body.lng

  if (
    latRaw === null ||
    lngRaw === null ||
    latRaw === '' ||
    lngRaw === '' ||
    latRaw === undefined ||
    lngRaw === undefined
  ) {
    return { lat: null, lng: null }
  }

  const lat = Number(latRaw)
  const lng = Number(lngRaw)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return undefined

  return { lat, lng }
}

export const hasValidLatLng = (doc) =>
  typeof doc?.lat === 'number' &&
  Number.isFinite(doc.lat) &&
  typeof doc?.lng === 'number' &&
  Number.isFinite(doc.lng)
