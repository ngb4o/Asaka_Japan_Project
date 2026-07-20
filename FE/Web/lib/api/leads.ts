import { apiRequest } from "@/lib/api/client";
import type { LeadInput } from "@/lib/types";

export async function submitLead(data: LeadInput) {
  return apiRequest<{ id: string }>("/leads", {
    method: "POST",
    body: data,
  });
}
