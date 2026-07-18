import { apiRequest } from "@/lib/api/client";
import type { AuthResult, UserProfile } from "@/lib/types";

export async function loginRequest(email: string, password: string) {
  return apiRequest<AuthResult>("/users/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

export async function registerRequest(
  email: string,
  password: string,
  username: string
) {
  return apiRequest<AuthResult>("/users/register", {
    method: "POST",
    body: { email, password, username },
    auth: false,
  });
}

export async function logoutRequest() {
  return apiRequest<boolean>("/users/logout", { method: "POST" });
}

export async function getProfileRequest() {
  return apiRequest<UserProfile>("/users/userAuth");
}
