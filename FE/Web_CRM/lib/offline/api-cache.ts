import {
  idbClear,
  idbCount,
  idbDelete,
  idbGet,
  idbGetAll,
  idbPut,
  STORE_API,
} from "@/lib/offline/idb";

export type ApiCacheEntry = {
  key: string;
  path: string;
  data: unknown;
  savedAt: number;
};

const MAX_ENTRIES = 400;
const SKIP_PREFIXES = ["/auth/", "/notifications/push/"];

export function shouldCacheGet(path: string) {
  const clean = path.split("?")[0] || path;
  return !SKIP_PREFIXES.some((prefix) => clean.startsWith(prefix));
}

export function cacheKeyFor(method: string, path: string) {
  return `${method.toUpperCase()}:${path}`;
}

export async function readApiCache(path: string): Promise<ApiCacheEntry | undefined> {
  const key = cacheKeyFor("GET", path);
  return idbGet<ApiCacheEntry>(STORE_API, key);
}

export async function writeApiCache(path: string, data: unknown): Promise<void> {
  if (!shouldCacheGet(path)) return;
  const key = cacheKeyFor("GET", path);
  const entry: ApiCacheEntry = {
    key,
    path,
    data,
    savedAt: Date.now(),
  };
  await idbPut(STORE_API, entry);
  await evictOldestIfNeeded();
}

export async function clearApiCache(): Promise<void> {
  await idbClear(STORE_API);
}

async function evictOldestIfNeeded() {
  const count = await idbCount(STORE_API);
  if (count <= MAX_ENTRIES) return;
  const all = await idbGetAll<ApiCacheEntry>(STORE_API);
  all.sort((a, b) => a.savedAt - b.savedAt);
  const removeCount = count - MAX_ENTRIES;
  await Promise.all(
    all.slice(0, removeCount).map((entry) => idbDelete(STORE_API, entry.key))
  );
}

const CACHE_HIT_EVENT = "crm:offline-cache-hit";

export function emitOfflineCacheHit(savedAt: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CACHE_HIT_EVENT, { detail: { savedAt } })
  );
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
