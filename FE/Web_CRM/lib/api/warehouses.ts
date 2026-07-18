import { apiRequest } from "@/lib/api/client";
import { appendPaginationParams, type PaginationParams } from "@/lib/pagination";
import type { PaginatedResult, Warehouse, WarehouseInput } from "@/lib/types";

export async function getWarehouses(params?: {
  search?: string;
  status?: string;
} & PaginationParams) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  appendPaginationParams(query, params);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PaginatedResult<Warehouse>>(`/warehouses${suffix}`);
}

export async function createWarehouse(data: WarehouseInput) {
  return apiRequest<Warehouse>("/warehouses", {
    method: "POST",
    body: data,
  });
}

export async function updateWarehouse(id: string, data: WarehouseInput) {
  return apiRequest<Warehouse>(`/warehouses/${id}`, {
    method: "PUT",
    body: data,
  });
}

export async function deleteWarehouse(id: string) {
  return apiRequest<{ message: string }>(`/warehouses/${id}`, {
    method: "DELETE",
  });
}
