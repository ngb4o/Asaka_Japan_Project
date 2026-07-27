import { apiRequest } from "@/lib/api/client";
import { appendPaginationParams, type PaginationParams } from "@/lib/pagination";
import type { Employee, EmployeeInput, PaginatedResult } from "@/lib/types";

export async function getEmployees(
  params?: { search?: string; status?: string } & PaginationParams
) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  appendPaginationParams(query, params);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PaginatedResult<Employee>>(`/employees${suffix}`);
}

export async function createEmployee(data: EmployeeInput) {
  return apiRequest<Employee>("/employees", { method: "POST", body: data });
}

export async function updateEmployee(id: string, data: Partial<EmployeeInput>) {
  return apiRequest<Employee>(`/employees/${id}`, { method: "PUT", body: data });
}

export async function deleteEmployee(id: string) {
  return apiRequest<{ message: string }>(`/employees/${id}`, { method: "DELETE" });
}
