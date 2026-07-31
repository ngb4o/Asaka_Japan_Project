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

/** iPhone / iPad (incl. iPadOS desktop UA) */
export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ may report as Mac
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** Launched as installed Home Screen / PWA (required for iOS Web Push) */
export function isInstalledPwa() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches
  );
}

export function isPushSupported() {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext) return false;
  // iOS: PushManager only works reliably in installed PWA
  if (isIosDevice() && !isInstalledPwa()) return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getPushBlockReason(): string | null {
  if (typeof window === "undefined") return "Không khả dụng";
  if (!window.isSecureContext) {
    return "Web Push cần HTTPS. Mở CRM bằng https://… rồi bật lại thông báo.";
  }
  if (isIosDevice() && !isInstalledPwa()) {
    return "Trên iPhone/iPad: Safari → Share → Thêm vào Màn hình chính → mở app từ icon đó → mới bật được thông báo đẩy (iOS 16.4+).";
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    if (isIosDevice()) {
      return "iOS cần mở từ Home Screen (iOS 16.4+). Safari thường không hỗ trợ push.";
    }
    return "Trình duyệt / thiết bị không hỗ trợ Web Push.";
  }
  if (!("Notification" in window)) {
    return "Thiết bị không hỗ trợ Notification API.";
  }
  return null;
}

export async function registerPushServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.register(SW_PATH, {
    scope: "/",
    updateViaCache: "none",
  });
  // Ensure activating worker takes control (important on iOS)
  await registration.update().catch(() => {});
  return registration;
}

async function waitForActiveWorker(registration: ServiceWorkerRegistration) {
  if (registration.active) return registration.active;

  const worker = registration.installing || registration.waiting;
  if (!worker) {
    await navigator.serviceWorker.ready;
    return registration.active;
  }

  await new Promise<void>((resolve) => {
    worker.addEventListener("statechange", () => {
      if (worker.state === "activated") resolve();
    });
  });
  return registration.active;
}

export async function getCurrentPushSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function enableWebPush() {
  const blocked = getPushBlockReason();
  if (blocked) throw new Error(blocked);

  // Permission must come from a user gesture — caller is the Bật button
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      isIosDevice()
        ? "Hãy cho phép thông báo. Nếu đã chặn: Cài đặt → Thông báo → ASAKA CRM → Bật."
        : "Bạn cần cho phép thông báo để nhận push"
    );
  }

  const { publicKey, enabled } = await getPushVapidPublicKey();
  if (!enabled || !publicKey) {
    throw new Error("Máy chủ chưa cấu hình Web Push (VAPID)");
  }

  const registration = await registerPushServiceWorker();
  if (!registration) {
    throw new Error("Không đăng ký được Service Worker");
  }
  await waitForActiveWorker(registration);
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    // Refresh stale iOS subscriptions after reinstall / SW update
    try {
      await subscription.unsubscribe();
    } catch {
      // ignore
    }
    subscription = null;
  }

  subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

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

  if (local && permission === "granted") {
    try {
      await subscribePush(local.toJSON());
    } catch {
      // ignore
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
