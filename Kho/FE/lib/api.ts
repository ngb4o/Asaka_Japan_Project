import { clearToken, getToken } from "@/lib/session";
import type {
  AuthUser,
  ItemInput,
  ItemList,
  LoginResult,
  MovementInput,
  MovementList,
  MovementResult,
  WarehouseItem,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8018";

export function mediaUrl(path: string) {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path}`;
}

async function readData<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 && getToken()) {
    clearToken();
    window.dispatchEvent(new Event("kho-unauthorized"));
  }
  if (!response.ok) {
    throw new Error(body.message || "Yêu cầu thất bại");
  }
  return body.data as T;
}

function authorizedFetch(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers, cache: "no-store" });
}

function toFormData(input: ItemInput) {
  const form = new FormData();
  form.append("name", input.name);
  form.append("quantity", String(input.quantity));
  if (input.column != null) form.append("column", String(input.column));
  if (input.image) form.append("image", input.image);
  return form;
}

export async function listItems(
  params: { q?: string; column?: string; page?: number; limit?: number } = {}
) {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 10));
  search.set("page", String(params.page ?? 1));
  if (params.q) search.set("q", params.q);
  if (params.column) search.set("column", params.column);

  const response = await authorizedFetch(`${API_URL}/api/v1/items?${search.toString()}`);
  return readData<ItemList>(response);
}

export async function createItem(input: ItemInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/items`, {
    method: "POST",
    body: toFormData(input),
  });
  return readData<WarehouseItem>(response);
}

export async function updateItem(id: string, input: ItemInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/items/${id}`, {
    method: "PUT",
    body: toFormData(input),
  });
  return readData<WarehouseItem>(response);
}

export async function deleteItem(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/items/${id}`, {
    method: "DELETE",
  });
  return readData<{ id: string }>(response);
}

export async function listMovements(
  params: { q?: string; type?: string; itemId?: string; page?: number; limit?: number } = {}
) {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 20));
  search.set("page", String(params.page ?? 1));
  if (params.q) search.set("q", params.q);
  if (params.type) search.set("type", params.type);
  if (params.itemId) search.set("itemId", params.itemId);

  const response = await authorizedFetch(`${API_URL}/api/v1/movements?${search.toString()}`);
  return readData<MovementList>(response);
}

export async function createMovement(itemId: string, input: MovementInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/movements/items/${itemId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<MovementResult>(response);
}

export async function login(username: string, password: string) {
  const response = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  return readData<LoginResult>(response);
}

export async function currentUser() {
  const response = await authorizedFetch(`${API_URL}/api/v1/auth/me`);
  return readData<AuthUser>(response);
}
