// Service worker for the admin panel's push notifications. It only handles `push` and
// `notificationclick` — no caching, so it can never serve stale pages.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Tells any open dashboard tab what the worker is doing, so the settings page can show whether a
// push arrived and whether the notification was actually displayed (or why not).
async function report(message) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  windows.forEach((client) => client.postMessage({ source: "bemorovozi-sw", at: Date.now(), ...message }));
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "BemorOvozi";
  event.waitUntil(
    (async () => {
      await report({ type: "push-received", title });
      try {
        await self.registration.showNotification(title, {
          body: data.body || "",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          lang: "uz",
          // Same tag replaces the older notification for that feedback instead of stacking.
          tag: data.tag || undefined,
          // A notification with the same tag (raised locally by the dashboard tab) is replaced silently.
          renotify: false,
          // High-severity items stay until someone acts on them.
          requireInteraction: data.urgent === true,
          data: { url: data.url || "/dashboard" },
        });
        await report({ type: "shown", title });
      } catch (error) {
        await report({ type: "show-failed", title, error: String(error) });
        throw error;
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/dashboard", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Reuse an already open dashboard tab instead of piling up new ones.
      for (const client of windows) {
        if (new URL(client.url).pathname.startsWith("/dashboard")) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});
