const DEFAULT_LIMIT = 200
const MAX_LIMIT = 500

export const parsePaginationQuery = (query = {}) => {
  let limit = parseInt(query.limit, 10)
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT
  if (limit > MAX_LIMIT) limit = MAX_LIMIT

  let page = parseInt(query.page, 10)
  if (!Number.isFinite(page) || page < 1) page = 1

  const skip = (page - 1) * limit
  return { page, limit, skip }
}

export const buildPaginationResult = ({ items, total, limit, skip }, page) => {
  const totalPages = total > 0 ? Math.ceil(total / limit) : 1

  return {
    items,
    total,
    page: Math.min(Math.max(page, 1), totalPages),
    limit,
    skip,
    totalPages
  }
}
