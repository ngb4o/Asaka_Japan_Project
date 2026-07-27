import { apiRequest } from "@/lib/api/client";
import type { AuthResult, UserProfile } from "@/lib/types";

export async function loginRequest(email: string, password: string) {
  return apiRequest<AuthResult>("/users/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

export async function logoutRequest() {
  return apiRequest<boolean>("/users/logout", {
    method: "POST",
  });
}

export async function getProfileRequest() {
  return apiRequest<UserProfile>("/users/userAuth");
}

export async function changeOwnPasswordRequest(
  currentPassword: string,
  newPassword: string
) {
  return apiRequest<boolean>("/users/me/password", {
    method: "PUT",
    body: { currentPassword, newPassword },
  });
}
