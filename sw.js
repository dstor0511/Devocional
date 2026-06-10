const CACHE  = 'devocional-v3';
const ASSETS = [
  '/devocional/',
  '/devocional/index.html',
  '/devocional/manifest.json',
  '/devocional/icon-192.png',
  '/devocional/icon-512.png',
  '/devocional/css/base.css',
  '/devocional/css/pin.css',
  '/devocional/css/app.css',
  '/devocional/css/print.css',
  '/devocional/js/Markdown.js',
  '/devocional/js/Crypto.js',
  '/devocional/js/Bible.js',
  '/devocional/js/DataStore.js',
  '/devocional/js/UI.js',
  '/devocional/js/Pin.js',
  '/devocional/js/Export.js',
  '/devocional/js/App.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
