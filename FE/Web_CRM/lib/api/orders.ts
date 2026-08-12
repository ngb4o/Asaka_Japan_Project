import { apiRequest } from "@/lib/api/client";
import { appendPaginationParams, type PaginationParams } from "@/lib/pagination";
import type { Order, OrderAudit, OrderInput, PaginatedResult } from "@/lib/types";

export async function getOrders(params?: {
  search?: string;
  status?: string;
  paymentStatus?: string;
  /** unpaid + partial (và không lấy đơn hủy nếu không lọc status) */
  hasDebt?: boolean;
  dealerId?: string;
  deliveryEmployeeIds?: string;
  /** all = đơn phải gắn đủ mọi NV; any = ít nhất 1 NV */
  deliveryEmployeeMatch?: "all" | "any";
  withoutTrip?: boolean;
} & PaginationParams) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  if (params?.paymentStatus) query.set("paymentStatus", params.paymentStatus);
  if (params?.hasDebt) query.set("hasDebt", "true");
  if (params?.dealerId) query.set("dealerId", params.dealerId);
  if (params?.deliveryEmployeeIds) {
    query.set("deliveryEmployeeIds", params.deliveryEmployeeIds);
  }
  if (params?.deliveryEmployeeMatch) {
    query.set("deliveryEmployeeMatch", params.deliveryEmployeeMatch);
  }
  if (params?.withoutTrip) query.set("withoutTrip", "true");
  appendPaginationParams(query, params);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PaginatedResult<Order>>(`/orders${suffix}`);
}

export async function getOrder(id: string) {
  return apiRequest<Order>(`/orders/${id}`);
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

export async function getOrderAudits(id: string) {
  return apiRequest<{ items: OrderAudit[]; total: number }>(
    `/orders/${id}/audits`
  );
}

export async function sendOrderInvoiceEmail(
  id: string,
  data?: { email?: string }
) {
  return apiRequest<Order>(`/orders/${id}/invoice-email`, {
    method: "POST",
    body: data || {},
  });
}
