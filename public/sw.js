self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || "PowerWatch Alert",
      {
        body: data.body || "A new power outage update is available.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: data.tag || "powerwatch-alert",
        data: { url: data.url || "/alerts" },
      }
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = new URL(
    event.notification.data?.url || "/alerts",
    self.location.origin
  ).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (windows) => {
        for (const windowClient of windows) {
          if (windowClient.url.startsWith(self.location.origin)) {
            windowClient.navigate(target);
            return windowClient.focus();
          }
        }

        return clients.openWindow(target);
      }
    )
  );
});
