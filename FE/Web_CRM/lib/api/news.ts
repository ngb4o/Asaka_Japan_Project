import { apiRequest } from "@/lib/api/client";
import { appendPaginationParams, type PaginationParams } from "@/lib/pagination";
import type { News, NewsInput, PaginatedResult } from "@/lib/types";

export async function getNews(params?: {
  search?: string;
  status?: string;
} & PaginationParams) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  appendPaginationParams(query, params);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PaginatedResult<News>>(`/news${suffix}`);
}

export async function createNews(data: NewsInput) {
  return apiRequest<News>("/news", {
    method: "POST",
    body: data,
  });
}

export async function updateNews(id: string, data: Partial<NewsInput>) {
  return apiRequest<News>(`/news/${id}`, {
    method: "PUT",
    body: data,
  });
}

export async function deleteNews(id: string) {
  return apiRequest<{ message: string }>(`/news/${id}`, {
    method: "DELETE",
  });
}
