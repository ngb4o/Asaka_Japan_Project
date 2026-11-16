import { idbClear, idbCount, idbDelete, idbGet, idbGetAll, idbPut } from "@/lib/offline/idb";

export type ApiCacheEntry = {
  key: string;
  url: string;
  data: unknown;
  savedAt: number;
};

const MAX_ENTRIES = 400;
const LAST_SAVED_KEY = "kho-offline-saved-at";
const CACHE_HIT_EVENT = "kho:offline-cache-hit";

export function cacheKeyFor(url: string) {
  return `GET:${url}`;
}

export async function readApiCache(url: string): Promise<ApiCacheEntry | undefined> {
  return idbGet<ApiCacheEntry>(cacheKeyFor(url));
}

export async function writeApiCache(url: string, data: unknown): Promise<void> {
  const entry: ApiCacheEntry = {
    key: cacheKeyFor(url),
    url,
    data,
    savedAt: Date.now(),
  };
  await idbPut(entry);
  await evictOldestIfNeeded();
}

export async function clearApiCache(): Promise<void> {
  await idbClear();
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(LAST_SAVED_KEY);
  } catch {
    // ignore
  }
}

async function evictOldestIfNeeded() {
  const count = await idbCount();
  if (count <= MAX_ENTRIES) return;
  const all = await idbGetAll<ApiCacheEntry>();
  all.sort((a, b) => a.savedAt - b.savedAt);
  const removeCount = count - MAX_ENTRIES;
  await Promise.all(all.slice(0, removeCount).map((entry) => idbDelete(entry.key)));
}

export function emitOfflineCacheHit(savedAt: number) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LAST_SAVED_KEY, String(savedAt));
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(CACHE_HIT_EVENT, { detail: { savedAt } }));
}

export function readLastCacheSavedAt(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const value = Number(window.sessionStorage.getItem(LAST_SAVED_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function onOfflineCacheHit(handler: (savedAt: number) => void) {
  if (typeof window === "undefined") return () => undefined;
  const listener = (event: Event) => {
    const savedAt = (event as CustomEvent<{ savedAt: number }>).detail?.savedAt;
    if (typeof savedAt === "number") handler(savedAt);
  };
  window.addEventListener(CACHE_HIT_EVENT, listener);
  return () => window.removeEventListener(CACHE_HIT_EVENT, listener);
}
