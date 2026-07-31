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

self.addEventListener("push", (event) => {
  let data = {
    title: "ASAKA CRM",
    body: "Có cập nhật mới",
    url: "/dashboard",
    tag: "asaka-crm",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    try {
      const text = event.data && event.data.text();
      if (text) data.body = text;
    } catch {
      // ignore
    }
  }

  // iOS requires a visible notification for every push
  event.waitUntil(
    self.registration.showNotification(data.title || "ASAKA CRM", {
      body: data.body || "",
      icon: data.icon || "/icons/icon-192.png",
      badge: data.badge || "/icons/icon-192.png",
      tag: data.tag || "asaka-crm",
      data: { url: data.url || "/dashboard" },
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
          // navigate() is unreliable on iOS — prefer postMessage / openWindow
          try {
            client.postMessage({ type: "PUSH_NAVIGATE", url: targetUrl });
          } catch {
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
