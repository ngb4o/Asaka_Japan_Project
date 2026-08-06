import { apiRequest } from "@/lib/api/client";
import { appendPaginationParams, type PaginationParams } from "@/lib/pagination";
import type { PaginatedResult, Supplier, SupplierInput } from "@/lib/types";

export async function getSuppliers(
  params?: { search?: string; status?: string } & PaginationParams
) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  appendPaginationParams(query, params);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PaginatedResult<Supplier>>(`/suppliers${suffix}`);
}

export async function getSupplier(id: string) {
  return apiRequest<Supplier>(`/suppliers/${id}`);
}

export async function createSupplier(data: SupplierInput) {
  return apiRequest<Supplier>("/suppliers", { method: "POST", body: data });
}

export async function updateSupplier(id: string, data: Partial<SupplierInput>) {
  return apiRequest<Supplier>(`/suppliers/${id}`, { method: "PUT", body: data });
}

export async function deleteSupplier(id: string) {
  return apiRequest(`/suppliers/${id}`, { method: "DELETE" });
}
