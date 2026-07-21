import { apiRequest } from "@/lib/api/client";
import type { AuthResult, UserProfile } from "@/lib/types";

export async function loginRequest(account: string, password: string) {
  return apiRequest<AuthResult>("/users/login", {
    method: "POST",
    body: { account, password },
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
