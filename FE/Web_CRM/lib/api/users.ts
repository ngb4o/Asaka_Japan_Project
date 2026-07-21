import { apiRequest } from "@/lib/api/client";
import type { UserProfile, UserRole } from "@/lib/types";

export async function getUsers() {
  return apiRequest<{ items: UserProfile[]; total: number }>("/users");
}

export async function updateUserRole(id: string, role: UserRole) {
  return apiRequest<UserProfile>(`/users/${id}/role`, {
    method: "PUT",
    body: { role },
  });
}
