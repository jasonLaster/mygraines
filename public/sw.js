// Service Worker for Push Notifications

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};

  const options = {
    body: data.body ?? "You have a new notification",
    icon: data.icon ?? "/favicon.ico",
    badge: "/favicon.ico",
    vibrate: [100, 50, 100],
    data: data.data ?? {},
    actions: [
      { action: "still-active", title: "Still Active" },
      { action: "ended", title: "It Ended" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title ?? "Migraine Tracker",
      options
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  // Open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If there's already a window open, focus it
      for (const client of clientList) {
        if (client.url.includes("/") && "focus" in client) {
          client.focus();
          // Send message to client about the action
          if (action && data?.migraineId) {
            client.postMessage({
              type: "notification-action",
              action,
              migraineId: data.migraineId,
            });
          }
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(data?.url ?? "/");
      }
    })
  );
});
