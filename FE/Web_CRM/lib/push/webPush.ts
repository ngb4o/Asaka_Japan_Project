"use client";

import {
  getPushStatus,
  getPushVapidPublicKey,
  sendTestPush,
  subscribePush,
  unsubscribePush,
} from "@/lib/api/push";
import {
  isInstalledPwa,
  isIosDevice,
  isPhoneDevice,
} from "@/lib/device";

const SW_PATH = "/sw.js";
const PUSH_OPT_OUT_KEY = "crm_push_opt_out";
const PUSH_AUTO_TRIED_KEY = "crm_push_auto_tried";

export type EnableWebPushOptions = {
  /** Skip local + server test notification (used for auto-enable on app open) */
  quiet?: boolean;
};

export function isPushOptedOut() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PUSH_OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPushOptedOut(optedOut: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (optedOut) {
      window.localStorage.setItem(PUSH_OPT_OUT_KEY, "1");
    } else {
      window.localStorage.removeItem(PUSH_OPT_OUT_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}

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

export { isInstalledPwa, isIosDevice } from "@/lib/device";

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
    if (worker.state === "activated") {
      resolve();
      return;
    }
    worker.addEventListener("statechange", () => {
      if (worker.state === "activated") resolve();
    });
  });
  return registration.active;
}

/** iOS often needs the SW to actually control this page before PushManager.subscribe works reliably */
async function ensureServiceWorkerControlsPage(
  registration: ServiceWorkerRegistration
) {
  await waitForActiveWorker(registration);
  await navigator.serviceWorker.ready;

  if (navigator.serviceWorker.controller) return;

  // Trigger claim via skipWaiting already done; wait for controllerchange
  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(() => resolve(), 3000);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => {
        window.clearTimeout(timeout);
        resolve();
      },
      { once: true }
    );
    // Nudge: reload registration clients claim path
    registration.active?.postMessage?.({ type: "CLAIM" });
  });
}

export async function getCurrentPushSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function enableWebPush(options: EnableWebPushOptions = {}) {
  const quiet = Boolean(options.quiet);
  const blocked = getPushBlockReason();
  if (blocked) throw new Error(blocked);

  setPushOptedOut(false);

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      isIosDevice()
        ? "Hãy cho phép thông báo. Nếu đã chặn: Cài đặt → Thông báo → ASAKA CRM → Cho phép."
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
  await ensureServiceWorkerControlsPage(registration);

  let subscription = await registration.pushManager.getSubscription();

  // iOS: reuse existing subscription when possible (forced unsubscribe can break APNs binding)
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Đăng ký push không đầy đủ (thiếu endpoint/keys)");
  }

  await subscribePush(json);

  if (!quiet) {
    try {
      await registration.showNotification("ASAKA CRM", {
        body: isIosDevice()
          ? "Đã bật trên iPhone. Đang gửi tin thử từ server…"
          : "Đã bật thông báo đẩy trên thiết bị này",
        tag: "asaka-push-enabled",
        data: { url: "/dashboard" },
      });
    } catch {
      // ignore local preview failures
    }

    try {
      await sendTestPush();
    } catch {
      // user can tap "Gửi thử" again
    }
  }

  return subscription;
}

/**
 * On phone: show the system permission prompt + subscribe automatically
 * (like native apps when first opening). Skips if opted out / denied / already on.
 */
export async function autoEnableWebPushOnAppOpen(): Promise<{
  enabled: boolean;
  skipped: boolean;
  reason?: string;
}> {
  if (typeof window === "undefined") {
    return { enabled: false, skipped: true, reason: "ssr" };
  }
  if (!isPhoneDevice()) {
    return { enabled: false, skipped: true, reason: "not_phone" };
  }
  if (!isPushSupported()) {
    return { enabled: false, skipped: true, reason: "unsupported" };
  }
  if (isPushOptedOut()) {
    return { enabled: false, skipped: true, reason: "opted_out" };
  }
  if (Notification.permission === "denied") {
    return { enabled: false, skipped: true, reason: "denied" };
  }

  try {
    if (window.sessionStorage.getItem(PUSH_AUTO_TRIED_KEY) === "1") {
      // Still re-sync if already granted but subscription missing
      if (Notification.permission !== "granted") {
        return { enabled: false, skipped: true, reason: "already_tried" };
      }
    } else {
      window.sessionStorage.setItem(PUSH_AUTO_TRIED_KEY, "1");
    }
  } catch {
    // private mode — continue
  }

  const existing = await getCurrentPushSubscription();
  if (existing && Notification.permission === "granted") {
    try {
      await subscribePush(existing.toJSON());
    } catch {
      // ignore
    }
    return { enabled: true, skipped: true, reason: "already_subscribed" };
  }

  await enableWebPush({ quiet: true });
  return { enabled: true, skipped: false };
}

export async function requestTestPush() {
  return sendTestPush();
}

export async function disableWebPush() {
  setPushOptedOut(true);
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
