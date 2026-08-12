// AT-GeoFiber Pro Service Worker v2.4.1
// استراتيجية متقدمة: Network First مع تخزين انتقائي وتجاوز Firebase

const CACHE_NAME = 'geofiber-cache-v2.4.1';

// الأصول الأساسية التي يجب تخزينها عند التثبيت
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// تثبيت العامل الخدمي وتحميل الملفات الأساسية
self.addEventListener('install', (event) => {
  console.log('[SW] تثبيت Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] تخزين الملفات الأساسية');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting()) // تفعيل العامل فوراً
  );
});

// تفعيل العامل وتنظيف الإصدارات القديمة
self.addEventListener('activate', (event) => {
  console.log('[SW] تفعيل Service Worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim()) // السيطرة على جميع العملاء
  );
});

// استراتيجية الطلب: الشبكة أولاً، وإذا فشل نستخدم الكاش
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاوز طلبات Firebase (لا تخزين لها، تحتاج اتصال حي)
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('at-optismart-default-rtdb.firebaseio.com') ||
    url.hostname.includes('at-optismart.firebaseapp.com')
  ) {
    return; // نترك المتصفح يتعامل معها بشكل طبيعي
  }

  // بالنسبة لباقي الملفات، نطبق Network First
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // إذا نجح الاتصال، نخزن نسخة في الكاش لاستخدامها لاحقاً
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // إذا فشل الاتصال (Offline)، نبحث في الكاش
        return caches.match(request).then((cachedResponse) => {
          return cachedResponse || new Response('أنت غير متصل بالإنترنت', { status: 503 });
        });
      })
  );
});

// إشعار المستخدم بوجود تحديث للتطبيق
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
