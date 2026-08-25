import { apiRequest } from "@/lib/api/client";
import { appendPaginationParams, type PaginationParams } from "@/lib/pagination";
import type {
  Quote,
  QuoteFormPayload,
  QuoteListResponse,
} from "@/types/quote";

export async function getQuotes(params?: { search?: string } & PaginationParams) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  appendPaginationParams(query, params);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<QuoteListResponse>(`/quotes${suffix}`);
}

export async function getQuote(id: string) {
  return apiRequest<Quote>(`/quotes/${id}`);
}

export async function createQuote(data: QuoteFormPayload) {
  return apiRequest<Quote>("/quotes", {
    method: "POST",
    body: data,
  });
}

export async function updateQuote(id: string, data: QuoteFormPayload) {
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