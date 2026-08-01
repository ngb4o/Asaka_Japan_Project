/* ASAKA CRM — Web Push service worker (Android + iOS PWA) */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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

  // iOS requires EVERY push to show a visible notification or it may revoke permission
  event.waitUntil(
    self.registration
      .showNotification(String(data.title || "ASAKA CRM").slice(0, 64), {
        body: String(data.body || "Có cập nhật mới").slice(0, 180),
        icon: assetUrl(data.icon || "/icons/icon-192.png"),
        badge: assetUrl(data.badge || "/icons/icon-192.png"),
        tag: data.tag || "asaka-crm",
        data: { url: data.url || "/dashboard" },
      })
      .catch(function (err) {
        console.error("[sw] showNotification failed", err);
        return self.registration.showNotification("ASAKA CRM", {
          body: "Có cập nhật mới",
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
