import { apiRequest } from "@/lib/api/client";
import type { ReceivablesSummary } from "@/lib/types";

export async function getReceivablesSummary(params?: { q?: string }) {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<ReceivablesSummary>(`/receivables/summary${suffix}`);
}
