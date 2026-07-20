import { apiRequest } from "@/lib/api/client";
import type { NotificationSummary } from "@/lib/types";

export async function getNotifications() {
  return apiRequest<NotificationSummary>("/notifications");
}

export async function markAllNotificationsRead() {
  return apiRequest<{ message: string }>("/notifications/mark-all-read", {
    method: "POST",
  });
}
