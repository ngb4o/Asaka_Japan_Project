import { apiRequest } from "@/lib/api/client";
import { appendPaginationParams, type PaginationParams } from "@/lib/pagination";
import type { Order, PaginatedResult, Quote, QuoteInput } from "@/lib/types";

export async function getQuotes(params?: {
  search?: string;
  status?: string;
  dealerId?: string;
} & PaginationParams) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  if (params?.dealerId) query.set("dealerId", params.dealerId);
  appendPaginationParams(query, params);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PaginatedResult<Quote>>(`/quotes${suffix}`);
}

export async function createQuote(data: QuoteInput) {
  return apiRequest<Quote>("/quotes", {
    method: "POST",
    body: data,
  });
}

export async function updateQuote(id: string, data: Partial<QuoteInput>) {
  return apiRequest<Quote>(`/quotes/${id}`, {
    method: "PUT",
    body: data,
  });
}

export async function deleteQuote(id: string) {
  return apiRequest<{ message: string }>(`/quotes/${id}`, {
    method: "DELETE",
  });
}

export async function convertQuoteToOrder(
  id: string,
  data?: { warehouseId?: string; note?: string }
) {
  return apiRequest<Order>(`/quotes/${id}/convert-to-order`, {
    method: "POST",
    body: data || {},
  });
}
