/** Normalize VN phones to 0xxxxxxxxx for matching. */
export const normalizePhone = (phone) => {
  if (!phone) return ''

  let digits = String(phone).replace(/\D/g, '')

  if (digits.startsWith('84') && digits.length >= 10) {
    digits = `0${digits.slice(2)}`
  }

  return digits
}
