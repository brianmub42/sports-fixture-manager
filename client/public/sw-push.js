// Service worker for Web Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = {
      title: 'Tournament Update',
      body: event.data.text(),
      icon: '/icon.svg',
      data: '/'
    };
  }

  const title = payload.title || 'Tournament Update';
  const options = {
    body: payload.body || 'New update available',
    icon: payload.icon || '/icon.svg',
    badge: payload.badge || '/icon.svg',
    vibrate: [200, 100, 200],
    data: payload.data || '/',
    actions: [
      { action: 'open', title: 'View Update' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && typeof event.notification.data === 'string') 
    ? event.notification.data 
    : (event.notification.data?.url || '/');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(targetUrl)) {
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
