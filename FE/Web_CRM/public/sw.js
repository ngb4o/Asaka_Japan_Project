/* ASAKA CRM — Service worker: push + app shell + offline pages + sync */

const SHELL_CACHE = "asaka-shell-v4";
const PAGE_CACHE = "asaka-pages-v1";
const STATIC_CACHE = "asaka-static-v1";

const PRECACHE_URLS = [
  "/",
  "/offline",
  "/login",
  "/dashboard",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/images/brand/logo.png",
];

self.addEventListener("install", (event) => {
  // Do not skipWaiting here — client shows “Có bản mới” and sends SKIP_WAITING.
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined)
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (data.type === "CACHE_URLS" && Array.isArray(data.urls)) {
    event.waitUntil(cacheSameOriginUrls(data.urls));
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, PAGE_CACHE, STATIC_CACHE]);
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => {
            if (keep.has(key)) return false;
            return (
              key.startsWith("asaka-shell-") ||
              key.startsWith("asaka-pages-") ||
              key.startsWith("asaka-static-")
            );
          })
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

async function cacheSameOriginUrls(urls) {
  const cache = await caches.open(PAGE_CACHE);
  await Promise.all(
    urls.map(async (raw) => {
      try {
        const url = new URL(String(raw), self.location.origin);
        if (url.origin !== self.location.origin) return;
        const response = await fetch(url.href, {
          credentials: "same-origin",
          redirect: "follow",
        });
        if (response.ok) {
          await cache.put(url.pathname + url.search, response.clone());
          await cache.put(url.href, response.clone());
        }
      } catch (_) {
        // ignore individual failures
      }
    })
  );
}

function isStaticAsset(url) {
  const path = url.pathname;
  return (
    path.startsWith("/_next/static/") ||
    path.startsWith("/icons/") ||
    path.startsWith("/images/") ||
    path === "/favicon.ico" ||
    path === "/manifest.webmanifest" ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|webp|svg|ico|map)$/i.test(path)
  );
}

function isNavigationRequest(request) {
  if (request.mode === "navigate") return true;
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/html");
}

function isRscRequest(request, url) {
  return (
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-Prefetch") === "1" ||
    url.searchParams.has("_rsc")
  );
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      await cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (_) {
    const cached =
      (await cache.match(request)) ||
      (await caches.match(request)) ||
      (await cache.match("/dashboard")) ||
      (await caches.match("/dashboard")) ||
      (await caches.match(new URL("/dashboard", self.location.origin).href)) ||
      (await caches.match("/offline")) ||
      (await caches.match(new URL("/offline", self.location.origin).href));

    if (cached) return cached;

    return new Response(
      "<!doctype html><html lang='vi'><head><meta charset='utf-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/><title>Offline</title></head><body style='font-family:system-ui;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#0a110e;color:#eef5f1;margin:0'><div style='text-align:center;padding:24px'><h1 style='font-size:22px;margin:0 0 8px'>Bạn đang ngoại tuyến</h1><p style='opacity:.75;margin:0 0 16px'>Mở lại khi có mạng để dùng ASAKA CRM.</p><button onclick='location.reload()' style='height:40px;padding:0 16px;border:0;border-radius:10px;background:#3dcc6a;color:#062a12;font-weight:600'>Thử lại</button></div></body></html>",
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Refresh in background
    void (async () => {
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) {
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(request, fresh.clone());
        }
      } catch (_) {}
    })();
    return cached;
  }

  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (_) {
    return (
      (await caches.match(request)) ||
      new Response("", { status: 503, statusText: "Offline" })
    );
  }
}

async function networkFirstSameOrigin(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      await cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (_) {
    const cached = (await cache.match(request)) || (await caches.match(request));
    if (cached) return cached;
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

  // Never intercept API / cross-origin (IndexedDB handles API offline)
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (isRscRequest(request, url)) {
    event.respondWith(networkFirstSameOrigin(request));
  }
});

/** Chrome/Android: flush queue when connectivity returns */
self.addEventListener("sync", (event) => {
  if (event.tag !== "asaka-crm-sync") return;
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        client.postMessage({ type: "ASAKA_BG_SYNC" });
      }
    })()
  );
});

function toAbsoluteUrl(path) {
  try {
    return new URL(path || "/dashboard", self.location.origin).href;
  } catch {
    return self.location.origin + "/dashboard";
  }
}

function assetUrl(path) {
  return toAbsoluteUrl(path || "/icons/icon-192.png");
}

function parsePushData(event) {
  const fallback = {
    title: "ASAKA CRM",
    body: "Có cập nhật mới",
    url: "/dashboard",
    tag: "asaka-crm",
  };

  if (!event.data) return fallback;

  try {
    return { ...fallback, ...event.data.json() };
  } catch (_) {
    // ignore json errors
  }

  try {
    const text = event.data.text();
    if (text) return { ...fallback, body: text };
  } catch (_) {
    // ignore text errors
  }

  return fallback;
}

self.addEventListener("push", (event) => {
  const data = parsePushData(event);
  const baseTag = String(data.tag || "asaka-crm").slice(0, 48);
  const tag = `${baseTag}-${Date.now()}`;

  event.waitUntil(
    self.registration
      .showNotification(String(data.title || "ASAKA CRM").slice(0, 64), {
        body: String(data.body || "Có cập nhật mới").slice(0, 240),
        icon: assetUrl(data.icon || "/icons/icon-192.png"),
        badge: assetUrl(data.badge || "/icons/icon-192.png"),
        tag,
        renotify: true,
        data: { url: data.url || "/dashboard" },
      })
      .then(function () {
        if (navigator.setAppBadge) {
          return navigator.setAppBadge().catch(function () {});
        }
      })
      .catch(function () {
        return self.registration.showNotification("ASAKA CRM", {
          body: "Có cập nhật mới",
          tag: `asaka-crm-${Date.now()}`,
          renotify: true,
          data: { url: "/dashboard" },
        });
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = toAbsoluteUrl(
    (event.notification.data && event.notification.data.url) || "/dashboard"
  );

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        try {
          if ("navigate" in client && typeof client.navigate === "function") {
            await client.navigate(targetUrl);
            if ("focus" in client) await client.focus();
            return;
          }
        } catch (_) {
          // fall through
        }

        if ("focus" in client) {
          await client.focus();
          try {
            client.postMessage({ type: "PUSH_NAVIGATE", url: targetUrl });
          } catch (_) {
            // ignore
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
