import type { ItemInput, ItemList, WarehouseItem } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8018";

export function mediaUrl(path: string) {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path}`;
}

async function readData<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || "Yêu cầu thất bại");
  }
  return body.data as T;
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

  const response = await fetch(`${API_URL}/api/v1/items?${search.toString()}`, {
    cache: "no-store",
  });
  return readData<ItemList>(response);
}

export async function createItem(input: ItemInput) {
  const response = await fetch(`${API_URL}/api/v1/items`, {
    method: "POST",
    body: toFormData(input),
  });
  return readData<WarehouseItem>(response);
}

export async function updateItem(id: string, input: ItemInput) {
  const response = await fetch(`${API_URL}/api/v1/items/${id}`, {
    method: "PUT",
    body: toFormData(input),
  });
  return readData<WarehouseItem>(response);
}

export async function deleteItem(id: string) {
  const response = await fetch(`${API_URL}/api/v1/items/${id}`, {
    method: "DELETE",
  });
  return readData<{ id: string }>(response);
}
