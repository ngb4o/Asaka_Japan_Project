const VI_CHAR_MAP = {
  a: 'aáàảãạăắằẳẵặâấầẩẫậAÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ',
  e: 'eéèẻẽẹêếềểễệEÉÈẺẼẸÊẾỀỂỄỆ',
  i: 'iíìỉĩịIÍÌỈĨỊ',
  o: 'oóòỏõọôốồổỗộơớờởỡợOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢ',
  u: 'uúùủũụưứừửữựUÚÙỦŨỤƯỨỪỬỮỰ',
  y: 'yýỳỷỹỵYÝỲỶỸỴ',
  d: 'dđDĐ'
}

const removeDiacritics = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const toAccentInsensitivePattern = (input) => {
  const raw = String(input || '').trim()
  if (!raw) return null

  let pattern = ''
  for (const ch of removeDiacritics(raw)) {
    const key = ch.toLowerCase()
    pattern += VI_CHAR_MAP[key] ? `[${VI_CHAR_MAP[key]}]` : escapeRegex(ch)
  }

  return pattern
}

export const buildSearchFilter = (fields, keyword) => {
  const pattern = toAccentInsensitivePattern(keyword)
  if (!pattern || !fields?.length) return null

  const regex = { $regex: pattern, $options: 'i' }
  return { $or: fields.map((field) => ({ [field]: regex })) }
}
