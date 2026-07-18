import { apiRequest } from "@/lib/api/client";
import { appendPaginationParams, type PaginationParams } from "@/lib/pagination";
import type {
  PaginatedResult,
  ProductCategory,
  ProductCategoryInput,
} from "@/lib/types";

export async function getProductCategories(params?: {
  search?: string;
  status?: string;
} & PaginationParams) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  appendPaginationParams(query, params);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PaginatedResult<ProductCategory>>(
    `/product-categories${suffix}`
  );
}

export async function createProductCategory(data: ProductCategoryInput) {
  return apiRequest<ProductCategory>("/product-categories", {
    method: "POST",
    body: data,
  });
}

export async function updateProductCategory(
  id: string,
  data: ProductCategoryInput
) {
  return apiRequest<ProductCategory>(`/product-categories/${id}`, {
    method: "PUT",
    body: data,
  });
}

export async function deleteProductCategory(id: string) {
  return apiRequest<{ message: string }>(`/product-categories/${id}`, {
    method: "DELETE",
  });
}
