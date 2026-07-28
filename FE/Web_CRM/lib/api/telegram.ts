import { apiRequest } from "@/lib/api/client";

export type TelegramContactRole = "customer" | "dealer" | "staff";

export type TelegramContact = {
  id: string;
  chatId: string;
  phone?: string;
  displayName?: string;
  username?: string;
  role: TelegramContactRole;
  fromEnv?: boolean;
  lastInteractedAt?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
};

export type TelegramStatus = {
  enabled: boolean;
  hasBotToken: boolean;
  botUsername: string | null;
  mode: "webhook" | "polling";
  staffRecipientCount: number;
};

export type TelegramContactList = {
  items: TelegramContact[];
  total: number;
  page: number;
  limit: number;
  envStaffChatIds: string[];
};

export async function getTelegramStatus() {
  return apiRequest<TelegramStatus>("/telegram/status");
}

export async function getTelegramContacts(params?: {
  role?: TelegramContactRole;
  page?: number;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params?.role) search.set("role", params.role);
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return apiRequest<TelegramContactList>(
    `/telegram/contacts${qs ? `?${qs}` : ""}`
  );
}

export async function upsertTelegramContact(body: {
  chatId: string;
  displayName?: string;
  phone?: string;
  username?: string;
  role?: TelegramContactRole;
}) {
  return apiRequest<TelegramContact>("/telegram/contacts", {
    method: "POST",
    body,
  });
}

export async function deleteTelegramContact(chatId: string) {
  return apiRequest<{ message: string }>(
    `/telegram/contacts/${encodeURIComponent(chatId)}`,
    { method: "DELETE" }
  );
}

export async function sendTelegramTest(body: {
  chatId?: string;
  phone?: string;
  staff?: boolean;
  text?: string;
}) {
  return apiRequest<unknown>("/telegram/test-send", {
    method: "POST",
    body,
  });
}
