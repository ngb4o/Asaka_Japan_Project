import { apiRequest } from "@/lib/api/client";
import { appendPaginationParams, type PaginationParams } from "@/lib/pagination";
import type { PaginatedResult, PayrollPeriod } from "@/lib/types";

export async function getPayrollPeriods(
  params?: { status?: string } & PaginationParams
) {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  appendPaginationParams(query, params);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PaginatedResult<PayrollPeriod>>(`/payroll${suffix}`);
}

export async function getPayrollPeriod(id: string) {
  return apiRequest<PayrollPeriod>(`/payroll/${id}`);
}

export async function generatePayroll(period: string, note?: string) {
  return apiRequest<PayrollPeriod>("/payroll/generate", {
    method: "POST",
    body: { period, note },
  });
}

export async function lockPayroll(id: string) {
  return apiRequest<PayrollPeriod>(`/payroll/${id}/lock`, { method: "POST" });
}

export async function deletePayroll(id: string) {
  return apiRequest<{ message: string }>(`/payroll/${id}`, { method: "DELETE" });
}
