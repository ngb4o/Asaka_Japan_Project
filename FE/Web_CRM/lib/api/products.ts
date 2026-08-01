import { apiRequest } from "@/lib/api/client";
import { appendPaginationParams, type PaginationParams } from "@/lib/pagination";
import type { PaginatedResult, Product, ProductInput } from "@/lib/types";

export async function getProducts(params?: {
  search?: string;
  status?: string;
  categoryId?: string;
} & PaginationParams) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  if (params?.categoryId) query.set("categoryId", params.categoryId);
  appendPaginationParams(query, params);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PaginatedResult<Product>>(`/products${suffix}`);
}

export async function getProduct(id: string) {
  return apiRequest<Product>(`/products/${id}`);
}

export async function createProduct(data: ProductInput) {
  return apiRequest<Product>("/products", {
    method: "POST",
    body: data,
  });
}

export async function updateProduct(id: string, data: Partial<ProductInput>) {
  return apiRequest<Product>(`/products/${id}`, {
    method: "PUT",
    body: data,
  });
}

export async function deleteProduct(id: string) {
  return apiRequest<{ message: string }>(`/products/${id}`, {
    method: "DELETE",
  });
}
