import { apiRequest } from "@/lib/api/client";
import { appendPaginationParams, type PaginationParams } from "@/lib/pagination";
import type { Lead, LeadInput, LeadUpdateInput, PaginatedResult } from "@/lib/types";

export async function createLeadPublic(data: LeadInput) {
  return apiRequest<Lead>("/leads", {
    method: "POST",
    body: data,
    auth: false,
  });
}

export async function createLead(data: LeadInput) {
  return apiRequest<Lead>("/leads/staff", {
    method: "POST",
    body: { ...data, source: data.source || "crm" },
  });
}

export async function getLeads(params?: {
  search?: string;
  status?: string;
  type?: string;
  region?: string;
} & PaginationParams) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  if (params?.type) query.set("type", params.type);
  if (params?.region) query.set("region", params.region);
  appendPaginationParams(query, params);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PaginatedResult<Lead>>(`/leads${suffix}`);
}

export async function getLead(id: string) {
  return apiRequest<Lead>(`/leads/${id}`);
}

export async function updateLead(id: string, data: LeadUpdateInput) {
  return apiRequest<Lead>(`/leads/${id}`, {
    method: "PUT",
    body: data,
  });
}

export async function deleteLead(id: string) {
  return apiRequest<{ message: string }>(`/leads/${id}`, {
    method: "DELETE",
  });
}

export async function convertLeadToDealer(id: string) {
  return apiRequest<{ id: string; name: string }>(`/leads/${id}/convert-to-dealer`, {
    method: "POST",
  });
}
