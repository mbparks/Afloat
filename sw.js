const CACHE = 'afloat-v1.9.0';
const ASSETS = [
  './','./index.html','./styles.css','./manifest.webmanifest','./assets/icon.svg',
  './js/app.js','./js/afloat.bundle.js','./js/gpx.js','./js/db.js','./js/demo.js','./js/calc.js','./js/ui.js','./js/model.js','./js/migrations.js'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(resp => {
    const clone = resp.clone();
    caches.open(CACHE).then(c => c.put(event.request, clone));
    return resp;
  }).catch(() => caches.match('./index.html'))));
});
