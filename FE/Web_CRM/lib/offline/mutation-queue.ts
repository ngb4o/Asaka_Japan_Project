import {
  idbClear,
  idbDelete,
  idbGetAll,
  idbPut,
  STORE_MUTATIONS,
} from "@/lib/offline/idb";

export type QueuedMutation = {
  id: string;
  path: string;
  method: "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth: boolean;
  createdAt: number;
};

const SKIP_PATHS = ["/auth/", "/notifications/push/", "/uploads"];

export function canQueueMutation(path: string, body?: unknown) {
  const clean = path.split("?")[0] || path;
  if (SKIP_PATHS.some((prefix) => clean.startsWith(prefix))) return false;
  // Don't queue binary / FormData-like payloads
  if (body instanceof FormData) return false;
  if (typeof Blob !== "undefined" && body instanceof Blob) return false;
  return true;
}

export async function enqueueMutation(
  input: Omit<QueuedMutation, "id" | "createdAt">
): Promise<QueuedMutation> {
  const item: QueuedMutation = {
    ...input,
    id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  await idbPut(STORE_MUTATIONS, item);
  emitQueueChanged();
  return item;
}

export async function listQueuedMutations(): Promise<QueuedMutation[]> {
  const rows = await idbGetAll<QueuedMutation>(STORE_MUTATIONS);
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeQueuedMutation(id: string): Promise<void> {
  await idbDelete(STORE_MUTATIONS, id);
  emitQueueChanged();
}

export async function clearMutationQueue(): Promise<void> {
  await idbClear(STORE_MUTATIONS);
  emitQueueChanged();
}

const QUEUE_EVENT = "crm:mutation-queue-changed";

export function emitQueueChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

export function onMutationQueueChanged(handler: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(QUEUE_EVENT, handler);
  return () => window.removeEventListener(QUEUE_EVENT, handler);
}
