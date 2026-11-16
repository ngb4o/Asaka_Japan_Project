const ALIASES = {
  lit: 'Lít',
  'lít': 'Lít',
  m: 'Mét',
  met: 'Mét',
  'mét': 'Mét',
  'vòng': 'Vòng',
  vong: 'Vòng',
  kg: 'kg',
  'cái': 'Cái',
  'bộ': 'Bộ',
  'bó': 'Bó',
  chai: 'Chai',
  lon: 'Lon',
  'cây': 'Cây',
  'cuộn': 'Cuộn',
  'tấm': 'Tấm',
  'quả': 'Quả',
  'tuýp': 'Tuýp',
  'bình': 'Bình'
}

const canonicalUnit = (value) => {
  const raw = String(value ?? '').trim().replace(/\s+/g, ' ')
  if (!raw) return ''

  const key = raw.toLocaleLowerCase('vi-VN')
  if (Object.prototype.hasOwnProperty.call(ALIASES, key)) return ALIASES[key]
  if (raw === key) return raw.charAt(0).toLocaleUpperCase('vi-VN') + raw.slice(1)
  return raw
}

const unitMatchValues = (value) => {
  const canonical = canonicalUnit(value)
  if (!canonical) return []

  const values = new Set([canonical])
  for (const [key, label] of Object.entries(ALIASES)) {
    if (label === canonical) values.add(key)
  }
  return [...values]
}

export const unitUtil = {
  canonicalUnit,
  unitMatchValues
}
