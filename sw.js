// Hors ligne : tous les fichiers sont gardés à l'installation. Le nom du cache change à chaque publication.
const CACHE = 'revisions-840a88d2989f';
const FILES = ["./","account.js","annale.js","app.js","ateliers.js","calculs-plus.js","clair.js","config.js","fonts/bricolage-grotesque-latin-ext-wght-normal.woff2","fonts/bricolage-grotesque-latin-wght-normal.woff2","game.js","icon-180.png","icon-192.png","icon-512.png","icon-maskable.png","icons.js","index.html","manifest.webmanifest","menu.js","merge.js","mobile.css","niveaux.js","pas.js","path.css","path.js","plus.js","simus.js","store.js","styles.css","td.css","td.js","theme.js","trainers-algo.js","trainers-annale.js","trainers-opti.js","trainers.js","tutos.js","vendor/qrcode.js","web.js"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('revisions-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || !u.href.startsWith(self.registration.scope)) return;
  e.respondWith(caches.open(CACHE).then((c) => c.match(e.request, { ignoreSearch: true })).then((r) => r || fetch(e.request)));
});
