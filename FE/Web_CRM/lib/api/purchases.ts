import { apiRequest } from "@/lib/api/client";
import { appendPaginationParams, type PaginationParams } from "@/lib/pagination";
import type { PaginatedResult, PurchaseInvoice } from "@/lib/types";

export async function getPurchases(
  params?: {
    supplierId?: string;
    paymentStatus?: string;
    hasDebt?: boolean;
  } & PaginationParams
) {
  const query = new URLSearchParams();
  if (params?.supplierId) query.set("supplierId", params.supplierId);
  if (params?.paymentStatus) query.set("paymentStatus", params.paymentStatus);
  if (params?.hasDebt) query.set("hasDebt", "true");
  appendPaginationParams(query, params);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PaginatedResult<PurchaseInvoice>>(`/purchases${suffix}`);
}

export async function getPurchase(id: string) {
  return apiRequest<PurchaseInvoice>(`/purchases/${id}`);
}

export async function recordPurchasePayment(
  id: string,
  data: { amount: number; note?: string }
) {
  return apiRequest<PurchaseInvoice>(`/purchases/${id}/payments`, {
    method: "POST",
    body: data,
  });
}
