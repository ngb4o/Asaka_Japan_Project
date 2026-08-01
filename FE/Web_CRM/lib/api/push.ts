import { apiRequest } from "@/lib/api/client";

export type PushStatus = {
  enabled: boolean;
  publicKey: string | null;
  subscribed: boolean;
  deviceCount: number;
  hasAppleDevice?: boolean;
};

export type PushTestResult = {
  sent: number;
  removed: number;
  apple: number;
  total: number;
  skipped?: boolean;
  reason?: string;
};

export async function getPushVapidPublicKey() {
  return apiRequest<{ enabled: boolean; publicKey: string | null }>(
    "/notifications/push/vapid-public-key"
  );
}

export async function getPushStatus() {
  return apiRequest<PushStatus>("/notifications/push/status");
}

export async function subscribePush(subscription: PushSubscriptionJSON) {
  return apiRequest<{ endpoint: string }>("/notifications/push/subscribe", {
    method: "POST",
    body: { subscription },
  });
}

export async function unsubscribePush(endpoint: string) {
  return apiRequest<{ deleted: boolean }>("/notifications/push/unsubscribe", {
    method: "POST",
    body: { endpoint },
  });
}

export async function sendTestPush() {
  return apiRequest<PushTestResult>("/notifications/push/test", {
    method: "POST",
  });
}
