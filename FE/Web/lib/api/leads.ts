import { apiRequest } from "@/lib/api/client";

export type LeadInput = {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  region?: string;
  message?: string;
  type?: "contact" | "dealer";
  source?: string;
};

export async function submitLead(data: LeadInput) {
  return apiRequest<{ id: string }>("/leads", {
    method: "POST",
    body: data,
  });
}
