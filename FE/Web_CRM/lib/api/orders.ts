import { apiRequest } from "@/lib/api/client";
import { appendPaginationParams, type PaginationParams } from "@/lib/pagination";
import type { Order, OrderInput, PaginatedResult } from "@/lib/types";

export async function getOrders(params?: {
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
  return apiRequest<PaginatedResult<Order>>(`/orders${suffix}`);
}

export async function createOrder(data: OrderInput) {
  return apiRequest<Order>("/orders", {
    method: "POST",
    body: data,
  });
}

export async function updateOrder(id: string, data: Partial<OrderInput>) {
  return apiRequest<Order>(`/orders/${id}`, {
    method: "PUT",
    body: data,
  });
}

export async function deleteOrder(id: string) {
  return apiRequest<{ message: string }>(`/orders/${id}`, {
    method: "DELETE",
  });
}

export async function recordOrderPayment(
  id: string,
  data: { amount: number; note?: string }
) {
  return apiRequest<Order>(`/orders/${id}/payments`, {
    method: "POST",
    body: data,
  });
}
