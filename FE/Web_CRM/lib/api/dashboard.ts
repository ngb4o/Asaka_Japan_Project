import { apiRequest } from "@/lib/api/client";
import type { DashboardSummary, SalesReport } from "@/lib/types";

export async function getDashboardSummary() {
  return apiRequest<DashboardSummary>("/dashboard/summary");
}

export async function getSalesReport(params?: {
  preset?: string;
  from?: string;
  to?: string;
  groupBy?: "day" | "month";
}) {
  const query = new URLSearchParams();
  if (params?.preset) query.set("preset", params.preset);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.groupBy) query.set("groupBy", params.groupBy);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<SalesReport>(`/dashboard/reports${suffix}`);
}
