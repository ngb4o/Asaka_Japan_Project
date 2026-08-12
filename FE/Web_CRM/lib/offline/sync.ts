import { emitCrmDataChanged } from "@/lib/hooks/useCrmDataRefresh";
import {
  listQueuedMutations,
  removeQueuedMutation,
  type QueuedMutation,
} from "@/lib/offline/mutation-queue";
import { getStoredToken } from "@/lib/auth/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8017/api";

const SYNC_EVENT = "crm:online-sync";

export type OnlineSyncResult = {
  flushed: number;
  failed: number;
};

let syncing = false;

/** Replay queued writes then ask pages to refresh. */
export async function flushOfflineSync(): Promise<OnlineSyncResult> {
  if (typeof window === "undefined") return { flushed: 0, failed: 0 };
  if (syncing) return { flushed: 0, failed: 0 };
  if (!navigator.onLine) return { flushed: 0, failed: 0 };

  syncing = true;
  let flushed = 0;
  let failed = 0;

  try {
    const queue = await listQueuedMutations();
    for (const item of queue) {
      try {
        await replayMutation(item);
        await removeQueuedMutation(item.id);
        flushed += 1;
      } catch {
        failed += 1;
        break;
      }
    }

    emitCrmDataChanged("all");
    window.dispatchEvent(
      new CustomEvent<OnlineSyncResult>(SYNC_EVENT, {
        detail: { flushed, failed },
      })
    );
  } finally {
    syncing = false;
  }

  return { flushed, failed };
}

async function replayMutation(item: QueuedMutation) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (item.auth) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${item.path}`, {
      method: item.method,
      headers,
      body: item.body !== undefined ? JSON.stringify(item.body) : undefined,
    });
  } catch {
    throw new Error("Không kết nối được máy chủ khi đồng bộ.");
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Đồng bộ thao tác thất bại");
  }
}

export function onOnlineSync(handler: (result: OnlineSyncResult) => void) {
  if (typeof window === "undefined") return () => undefined;
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<OnlineSyncResult>).detail;
    handler(detail ?? { flushed: 0, failed: 0 });
  };
  window.addEventListener(SYNC_EVENT, listener);
  return () => window.removeEventListener(SYNC_EVENT, listener);
}

/** Ask SW to register background sync when supported (Chrome/Android). */
export async function requestBackgroundSync(tag = "asaka-crm-sync") {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const syncManager = (
      registration as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      }
    ).sync;
    if (!syncManager) return false;
    await syncManager.register(tag);
    return true;
  } catch {
    return false;
  }
}
