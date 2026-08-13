import { apiRequest } from "@/lib/api/client";
import type { UserProfile, UserRole } from "@/lib/types";

export async function getUsers() {
  return apiRequest<{ items: UserProfile[]; total: number }>("/users");
}

export async function createUser(payload: {
  employeeId: string;
  email?: string;
  password?: string;
  roles: UserRole[];
  /** @deprecated prefer roles */
  role?: UserRole;
}) {
  return apiRequest<UserProfile>("/users", {
    method: "POST",
    body: payload,
  });
}

export async function updateUserPassword(id: string, password: string) {
  return apiRequest<{ emailSent?: boolean; emailError?: string }>(
    `/users/${id}/password`,
    {
      method: "PUT",
      body: { password },
    }
  );
}

export async function updateUserRole(id: string, roles: UserRole[]) {
  return apiRequest<UserProfile>(`/users/${id}/role`, {
    method: "PUT",
    body: { roles },
  });
}

export async function deleteUser(id: string) {
  return apiRequest<{ message: string }>(`/users/${id}`, {
    method: "DELETE",
  });
}
