import { apiRequest } from "@/lib/api/client";

export async function getRegions() {
  return apiRequest<string[]>("/regions");
}
