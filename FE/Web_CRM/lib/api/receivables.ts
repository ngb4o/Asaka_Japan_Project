import { apiRequest } from "@/lib/api/client";
import type {
  ReceivableDealerSummary,
  ReceivablesSummary,
} from "@/lib/types";

export async function getReceivablesSummary(params?: { q?: string }) {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<ReceivablesSummary>(`/receivables/summary${suffix}`);
}

export async function sendDealerReminderEmail(
  dealerId: string,
  data?: { email?: string }
) {
  return apiRequest<ReceivableDealerSummary>(
    `/receivables/dealers/${dealerId}/reminder-email`,
    {
      method: "POST",
      body: data || {},
    }
  );
}
