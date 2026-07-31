"use client";

import {
  getPushStatus,
  getPushVapidPublicKey,
  subscribePush,
  unsubscribePush,
} from "@/lib/api/push";

const SW_PATH = "/sw.js";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported() {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerPushServiceWorker() {
  if (!isPushSupported()) return null;
  return navigator.serviceWorker.register(SW_PATH, { scope: "/" });
}

export async function getCurrentPushSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function enableWebPush() {
  if (!isPushSupported()) {
    throw new Error("Trình duyệt / thiết bị không hỗ trợ Web Push");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Bạn cần cho phép thông báo để nhận push");
  }

  const { publicKey, enabled } = await getPushVapidPublicKey();
  if (!enabled || !publicKey) {
    throw new Error("Máy chủ chưa cấu hình Web Push (VAPID)");
  }

  await registerPushServiceWorker();
  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await subscribePush(subscription.toJSON());
  return subscription;
}

export async function disableWebPush() {
  const subscription = await getCurrentPushSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  try {
    await unsubscribePush(endpoint);
  } finally {
    await subscription.unsubscribe();
  }
}

export async function refreshPushStatus() {
  if (!isPushSupported()) {
    return {
      supported: false,
      permission: "denied" as NotificationPermission | "unsupported",
      localSubscribed: false,
      server: null as Awaited<ReturnType<typeof getPushStatus>> | null,
    };
  }

  const permission = Notification.permission;
  const local = await getCurrentPushSubscription();

  // Keep server in sync if this device already subscribed locally
  if (local && permission === "granted") {
    try {
      await subscribePush(local.toJSON());
    } catch {
      // ignore — may be offline / unauthorized
    }
  }

  let server: Awaited<ReturnType<typeof getPushStatus>> | null = null;
  try {
    server = await getPushStatus();
  } catch {
    server = null;
  }

  return {
    supported: true,
    permission,
    localSubscribed: Boolean(local),
    server,
  };
}
