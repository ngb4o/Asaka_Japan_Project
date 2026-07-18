export const slugify = (val) => {
  if (!val) return ''
  return String(val)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export const formatDocument = (doc) => {
  if (!doc) return null

  const { _id, ...rest } = doc

  return {
    id: _id.toString(),
    ...rest,
    ...(rest.categoryId && { categoryId: rest.categoryId.toString() }),
    ...(rest.warehouseId && { warehouseId: rest.warehouseId.toString() }),
    ...(rest.productId && { productId: rest.productId.toString() }),
    ...(rest.createdBy && { createdBy: rest.createdBy.toString() })
  }
}

export const formatDocuments = (docs) => docs.map(formatDocument)