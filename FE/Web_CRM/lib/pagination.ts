export const DEFAULT_PAGE_SIZE = 10;

export type PaginationParams = {
  page?: number;
  limit?: number;
};

export function appendPaginationParams(
  query: URLSearchParams,
  params?: PaginationParams
) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? DEFAULT_PAGE_SIZE;

  query.set("page", String(page));
  query.set("limit", String(limit));
}

export function getPageRange(page: number, limit: number, total: number) {
  if (total === 0) {
    return { from: 0, to: 0 };
  }

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return { from, to };
}

export function shouldReloadPreviousPage<T>(
  result: { items: T[]; total: number; totalPages: number },
  page: number
) {
  return result.items.length === 0 && result.total > 0 && page > 1;
}
