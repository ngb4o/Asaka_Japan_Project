export const formatDocument = (doc) => {
  if (!doc) return null

  const { _id, _destroy, ...rest } = doc

  return {
    id: _id.toString(),
    ...rest
  }
}

export const formatDocuments = (docs) => docs.map(formatDocument)
