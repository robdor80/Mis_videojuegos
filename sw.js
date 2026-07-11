// sw.js - Service Worker
const CACHE_NAME = 'inventory-v11';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/ui.js',
  './js/data.js',
  './js/form.js',
  './js/firebase.js',
  './js/report.js',
  './js/pwa.js',
  './assets/header.webp',
  './assets/icon.png',
  './assets/locations/fanxiang.png',
  './assets/locations/steam.png',
  './assets/locations/ubisoft.png',
  './assets/locations/wd_3.0.png',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 1. INSTALACIÓN: Guardamos la "cáscara" de la app (archivos estáticos)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierta');
        return Promise.allSettled(urlsToCache.map(url => cache.add(url)))
          .then(results => {
            results.forEach((result, index) => {
              if (result.status === 'rejected') {
                console.warn('No se pudo cachear:', urlsToCache[index], result.reason);
              }
            });
          });
      })
  );
});

// 2. ACTIVACIÓN: Limpiamos cachés viejas si actualizamos la app
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. INTERCEPTAR PETICIONES: Estrategia "Network First" (Red primero)
// Intentamos ir a internet para tener datos frescos (Firebase). 
// Si no hay internet, intentamos servir lo que haya en caché.
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
