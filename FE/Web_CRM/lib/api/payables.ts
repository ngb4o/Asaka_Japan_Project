import { apiRequest } from "@/lib/api/client";
import type { PayablesSummary } from "@/lib/types";

export async function getPayablesSummary(params?: { q?: string }) {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PayablesSummary>(`/payables/summary${suffix}`);
}
