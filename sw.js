// sw.js - Service Worker
const CACHE_NAME = 'inventory-v1';
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './js/ui.js',
  './js/data.js',
  './js/form.js',
  './js/firebase.js',
  './assets/header.webp',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 1. INSTALACIÓN: Guardamos la "cáscara" de la app (archivos estáticos)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierta');
        return cache.addAll(urlsToCache);
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
