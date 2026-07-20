import { apiRequest } from "@/lib/api/client";
import { appendPaginationParams, type PaginationParams } from "@/lib/pagination";
import type { Dealer, DealerInput, PaginatedResult } from "@/lib/types";

export async function getDealers(params?: {
  search?: string;
  status?: string;
  region?: string;
} & PaginationParams) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  if (params?.region) query.set("region", params.region);
  appendPaginationParams(query, params);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PaginatedResult<Dealer>>(`/dealers${suffix}`);
}

export async function createDealer(data: DealerInput) {
  return apiRequest<Dealer>("/dealers", {
    method: "POST",
    body: data,
  });
}

export async function updateDealer(id: string, data: DealerInput) {
  return apiRequest<Dealer>(`/dealers/${id}`, {
    method: "PUT",
    body: data,
  });
}

export async function deleteDealer(id: string) {
  return apiRequest<{ message: string }>(`/dealers/${id}`, {
    method: "DELETE",
  });
}
