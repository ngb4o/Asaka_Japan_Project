import { apiRequest } from "@/lib/api/client";
import type { DashboardSummary } from "@/lib/types";

export async function getDashboardSummary() {
  return apiRequest<DashboardSummary>("/dashboard/summary");
}
