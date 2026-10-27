self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(self.registration.showNotification(data.title || 'Order update', {
    body: data.body || 'Your order was updated.',
    icon: '/favicon.svg',
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    for (const windowClient of windows) {
      if ('focus' in windowClient) {
        windowClient.navigate(url);
        return windowClient.focus();
      }
    }
    return clients.openWindow(url);
  }));
});
