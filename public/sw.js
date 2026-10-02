// Service worker: shows phone notifications (like a chat-app message) and
// opens the right page when one is tapped.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Converge ’26", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Converge ’26";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/pwa-icon/192",
      badge: "/pwa-icon/badge",
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      vibrate: [120, 60, 120],
      timestamp: Date.now(),
      data: { url: data.url || "/me" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/me", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Reuse an open tab of the site if there is one.
      for (const w of windows) {
        if (w.url.startsWith(self.location.origin) && "focus" in w) {
          await w.navigate(url).catch(() => {});
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    })()
  );
});
