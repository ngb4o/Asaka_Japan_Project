const TOKEN_KEY = "crm_token";

export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )crm_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setToken(token: string) {
  const maxAge = 7 * 24 * 60 * 60;
  document.cookie = `crm_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  document.cookie = "crm_token=; path=/; max-age=0; SameSite=Lax";
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) || getToken();
}
