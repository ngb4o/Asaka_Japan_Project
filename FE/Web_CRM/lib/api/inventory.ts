import { apiRequest } from "@/lib/api/client";
import { appendPaginationParams, type PaginationParams } from "@/lib/pagination";
import type {
  InventoryMovementInput,
  InventoryTransaction,
  PaginatedResult,
  WarehouseStock,
} from "@/lib/types";

export async function getWarehouseStocks(params?: {
  warehouseId?: string;
  productId?: string;
  search?: string;
} & PaginationParams) {
  const query = new URLSearchParams();
  if (params?.warehouseId) query.set("warehouseId", params.warehouseId);
  if (params?.productId) query.set("productId", params.productId);
  if (params?.search) query.set("search", params.search);
  appendPaginationParams(query, params);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PaginatedResult<WarehouseStock>>(`/inventory/stocks${suffix}`);
}

export async function getInventoryTransactions(params?: {
  warehouseId?: string;
  productId?: string;
  type?: "import" | "export";
} & PaginationParams) {
  const query = new URLSearchParams();
  if (params?.warehouseId) query.set("warehouseId", params.warehouseId);
  if (params?.productId) query.set("productId", params.productId);
  if (params?.type) query.set("type", params.type);
  appendPaginationParams(query, params);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PaginatedResult<InventoryTransaction>>(
    `/inventory/transactions${suffix}`
  );
}

export async function importStock(data: InventoryMovementInput) {
  return apiRequest<InventoryTransaction>("/inventory/import", {
    method: "POST",
    body: data,
  });
}

export async function exportStock(data: InventoryMovementInput) {
  return apiRequest<InventoryTransaction>("/inventory/export", {
    method: "POST",
    body: data,
  });
}
