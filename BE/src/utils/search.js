/**
 * Vietnamese accent-insensitive MongoDB $regex helpers.
 * "hoa" matches "Hòa", "HOÀ", "hóa", …
 */

const VI_CHAR_MAP = {
  a: "aáàảãạăắằẳẵặâấầẩẫậAÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ",
  e: "eéèẻẽẹêếềểễệEÉÈẺẼẸÊẾỀỂỄỆ",
  i: "iíìỉĩịIÍÌỈĨỊ",
  o: "oóòỏõọôốồổỗộơớờởỡợOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢ",
  u: "uúùủũụưứừửữựUÚÙỦŨỤƯỨỪỬỮỰ",
  y: "yýỳỷỹỵYÝỲỶỸỴ",
  d: "dđDĐ"
}

const removeDiacritics = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Build a Mongo-friendly regex pattern string (no delimiters). */
export const toAccentInsensitivePattern = (input) => {
  const raw = String(input || "").trim()
  if (!raw) return null

  const normalized = removeDiacritics(raw)
  let pattern = ""

  for (const ch of normalized) {
    const key = ch.toLowerCase()
    if (VI_CHAR_MAP[key]) {
      pattern += `[${VI_CHAR_MAP[key]}]`
    } else {
      pattern += escapeRegex(ch)
    }
  }

  return pattern
}

/** `{ $regex, $options: 'i' }` or null when empty. */
export const toSearchRegex = (input) => {
  const pattern = toAccentInsensitivePattern(input)
  if (!pattern) return null
  return { $regex: pattern, $options: "i" }
}

/**
 * `{ $or: [ { field: regex }, ... ] }` for list search.
 * @param {string[]} fields
 * @param {string} keyword
 */
export const buildSearchFilter = (fields, keyword) => {
  const regex = toSearchRegex(keyword)
  if (!regex || !fields?.length) return null
  return { $or: fields.map((field) => ({ [field]: regex })) }
}
