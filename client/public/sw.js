// Service Worker for Together app push notifications
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  const isCall = data.tag === 'call';
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/heart.svg',
      badge: '/heart.svg',
      tag: data.tag || 'together',
      renotify: true,
      requireInteraction: isCall,
      data: { url: data.url || '/' },
      vibrate: isCall ? [500, 200, 500, 200, 500, 200, 500] : [200, 100, 200],
      actions: isCall ? [
        { action: 'answer', title: '接聽 📞' },
        { action: 'reject', title: '拒接 📵' },
      ] : [],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'reject') return;
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
