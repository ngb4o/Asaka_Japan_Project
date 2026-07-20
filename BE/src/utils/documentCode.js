import { GET_DB } from '~/config/mongodb'

export const generateDocumentCode = async (collectionName, prefix) => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const codePrefix = `${prefix}-${dateStr}-`

  const count = await GET_DB().collection(collectionName).countDocuments({
    code: { $regex: `^${codePrefix}` },
    _destroy: false
  })

  return `${codePrefix}${String(count + 1).padStart(3, '0')}`
}
