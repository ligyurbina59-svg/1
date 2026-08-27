const CACHE_NAME = 'pwa-builder-pro-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sw.js'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Cacheando assets...');
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Algunos assets no pudieron ser cacheados:', err);
        return Promise.all(
          ASSETS.map(url => 
            cache.add(url).catch(() => console.warn(`[SW] No se pudo cachear: ${url}`))
          )
        );
      });
    })
  );
  self.skipWaiting();
});

// Activar Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Activando Service Worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia Network First, Cache Fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });

        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then(response => {
            return response || caches.match('/index.html');
          });
      })
  );
});

// Sincronización en Background
self.addEventListener('sync', event => {
  console.log('[SW] Sincronización en background:', event.tag);
  
  if (event.tag === 'sync-manifest') {
    event.waitUntil(
      Promise.resolve().then(() => {
        console.log('[SW] Manifest sincronizado');
      })
    );
  }
});

// Manejo de Notificaciones Push
self.addEventListener('push', event => {
  console.log('[SW] Notificación push recibida');
  
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Nueva notificación de PWA Builder',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%23000000" width="192" height="192"/><text x="50%" y="50%" font-size="80" fill="white" font-weight="bold" text-anchor="middle" dy=".35em">PWA</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect fill="%23238636" width="96" height="96"/><text x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dy=".35em">✓</text></svg>',
    tag: data.tag || 'pwa-builder-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Abrir'
      },
      {
        action: 'close',
        title: 'Cerrar'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'PWA Builder', options)
  );
});

// Manejo de clicks en notificaciones
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notificación clickeada:', event.action);
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Cerrar notificaciones
self.addEventListener('notificationclose', event => {
  console.log('[SW] Notificación cerrada');
});

// Mensaje desde cliente
self.addEventListener('message', event => {
  console.log('[SW] Mensaje recibido:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
