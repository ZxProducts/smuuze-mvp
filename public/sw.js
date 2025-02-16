const CACHE_NAME = 'smuuze-cache-v1';
const OFFLINE_URL = '/offline';

// キャッシュするアセット
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
];

// API リクエストのパターン
const API_PATTERNS = [
  /^\/api\//,
  /\.supabase\.co/,
];

// キャッシュ戦略
const CACHE_STRATEGIES = {
  // 静的アセット: Cache First, フォールバックでネットワーク
  static: async (request) => {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch {
      return Response.error();
    }
  },

  // API: Network First, フォールバックでキャッシュ
  api: async (request) => {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, networkResponse.clone());
        return networkResponse;
      }
      throw new Error('Network response was not ok');
    } catch {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);
      return cachedResponse || Response.error();
    }
  },
};

// インストール時の処理
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 静的アセットをプリキャッシュ
      await cache.addAll(STATIC_ASSETS);
      // 即座にアクティベート
      await self.skipWaiting();
    })()
  );
});

// アクティベート時の処理
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 古いキャッシュを削除
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
      // 新しいSWをすぐにアクティベート
      await self.clients.claim();
    })()
  );
});

// フェッチ時の処理
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // APIリクエストの場合
  if (API_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(CACHE_STRATEGIES.api(request));
    return;
  }

  // 静的アセットの場合
  if (request.method === 'GET') {
    event.respondWith(CACHE_STRATEGIES.static(request));
    return;
  }

  // その他のリクエストはネットワークのみ
  event.respondWith(fetch(request));
});

// プッシュ通知の処理
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: data.url,
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data?.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});