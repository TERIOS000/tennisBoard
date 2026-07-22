self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = data.link || data.FCM_MSG?.data?.link || "/";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows[0];
    if (existing) {
      existing.navigate(target);
      return existing.focus();
    }
    return clients.openWindow(target);
  }));
});
