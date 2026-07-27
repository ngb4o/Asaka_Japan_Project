import { apiRequest } from "@/lib/api/client";
import { appendPaginationParams, type PaginationParams } from "@/lib/pagination";
import type {
  PaginatedResult,
  Trip,
  TripExpense,
  TripInput,
  TripStop,
} from "@/lib/types";

export async function getTrips(
  params?: { search?: string; status?: string } & PaginationParams
) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  appendPaginationParams(query, params);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PaginatedResult<Trip>>(`/trips${suffix}`);
}

export async function getTrip(id: string) {
  return apiRequest<Trip>(`/trips/${id}`);
}

export async function createTrip(data: TripInput) {
  return apiRequest<Trip>("/trips", { method: "POST", body: data });
}

export async function updateTrip(id: string, data: Partial<TripInput>) {
  return apiRequest<Trip>(`/trips/${id}`, { method: "PUT", body: data });
}

export async function deleteTrip(id: string) {
  return apiRequest<{ message: string }>(`/trips/${id}`, { method: "DELETE" });
}

export async function addTripStop(
  id: string,
  data: Partial<Omit<TripStop, "id" | "dealerName">>
) {
  return apiRequest<Trip>(`/trips/${id}/stops`, { method: "POST", body: data });
}

export async function removeTripStop(id: string, stopId: string) {
  return apiRequest<Trip>(`/trips/${id}/stops/${stopId}`, { method: "DELETE" });
}

export async function addTripAdvance(id: string, data: { amount: number; note?: string }) {
  return apiRequest<Trip>(`/trips/${id}/advances`, { method: "POST", body: data });
}

export async function addTripExpense(
  id: string,
  data: Partial<
    Pick<TripExpense, "category" | "amount" | "date" | "funding" | "receiptUrl" | "note">
  >
) {
  return apiRequest<Trip>(`/trips/${id}/expenses`, { method: "POST", body: data });
}

export async function reviewTripExpense(
  id: string,
  expenseId: string,
  status: "approved" | "rejected"
) {
  return apiRequest<Trip>(`/trips/${id}/expenses/${expenseId}/review`, {
    method: "PUT",
    body: { status },
  });
}

export async function settleTrip(id: string, note?: string) {
  return apiRequest<Trip>(`/trips/${id}/settle`, {
    method: "POST",
    body: { note: note || "" },
  });
}
