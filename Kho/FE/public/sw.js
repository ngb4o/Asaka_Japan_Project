/* Kho hàng — keep pages and files so the app can open without a network. API data lives in IndexedDB. */

const PAGE_CACHE = "kho-pages-v1";
const STATIC_CACHE = "kho-static-v1";

const PRECACHE_URLS = ["/", "/kho", "/lop", "/dau", "/drivers", "/phieu", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(cacheUrls(PRECACHE_URLS));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PAGE_CACHE, STATIC_CACHE]);
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("kho-") && !keep.has(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "CACHE_URLS" && Array.isArray(data.urls)) {
    event.waitUntil(cacheUrls(data.urls));
  }
});

async function cacheUrls(urls) {
  const cache = await caches.open(PAGE_CACHE);
  await Promise.all(
    urls.map(async (raw) => {
      try {
        const url = new URL(String(raw), self.location.origin);
        if (url.origin !== self.location.origin) return;
        const response = await fetch(url.href, { credentials: "same-origin", redirect: "follow" });
        if (!response.ok) return;
        await cache.put(url.pathname + url.search, response.clone());
        await cache.put(url.href, response.clone());
      } catch (_) {
        // One missing page should not block the rest.
      }
    })
  );
}

function isSkipped(url, request) {
  if (url.pathname.startsWith("/_next/webpack-hmr")) return true;
  if (url.pathname.startsWith("/_next/turbopack")) return true;
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/event-stream");
}

function isStaticAsset(url) {
  const path = url.pathname;
  return (
    path.startsWith("/_next/static/") ||
    path.startsWith("/icons/") ||
    path.startsWith("/images/") ||
    path === "/manifest.webmanifest" ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|webp|svg|ico)$/i.test(path)
  );
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const url = new URL(request.url);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      try {
        await cache.put(request, fresh.clone());
        if (request.mode === "navigate") await cache.put(url.pathname, fresh.clone());
      } catch (_) {
        // Some dev responses cannot be stored. The network result is still returned.
      }
    }
    return fresh;
  } catch (_) {
    const cached =
      (await cache.match(request)) ||
      (await caches.match(request)) ||
      (request.mode === "navigate" ? await cache.match(url.pathname) : undefined);
    if (cached) return cached;
    if (request.mode === "navigate") {
      return new Response(
        "<!doctype html><html lang='vi'><head><meta charset='utf-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/><title>Kho hàng</title></head><body style='font-family:system-ui;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f1f5f9;color:#0f172a;margin:0'><div style='text-align:center;padding:24px;max-width:28rem'><h1 style='font-size:20px;margin:0 0 8px'>Chưa có bản lưu trên máy</h1><p style='margin:0'>Mở Kho hàng khi có mạng một lần, rồi có thể xem lại lúc mất mạng.</p></div></body></html>",
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }
    return new Response("", { status: 503, statusText: "Offline" });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch (_) {
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (isSkipped(url, request)) return;

  event.respondWith(networkFirst(request, isStaticAsset(url) ? STATIC_CACHE : PAGE_CACHE));
});
