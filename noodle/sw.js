/* Noodle works offline: the page and its files are kept on the device. The page itself is fetched fresh when there is a connection (so updates arrive), and from the copy when there isn't. */
const CACHE = 'noodle-v1';
const CORE = ['./', 'index.html', 'reader.json', 'vendor/mp4-muxer.min.js', 'vendor/fonts/fonts.css',
  'vendor/fonts/Unbounded-700-latin.woff2', 'vendor/fonts/Unbounded-700-latin-ext.woff2', 'vendor/fonts/JetBrainsMono-500-latin.woff2', 'vendor/fonts/JetBrainsMono-500-latin-ext.woff2',
  'vendor/fonts/JetBrainsMono-700-latin.woff2', 'vendor/fonts/JetBrainsMono-700-latin-ext.woff2'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(new URL('./', location.href).pathname)) return;
  const page = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  if (page) {   // fresh when online, the kept copy when not
    e.respondWith(fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; }).catch(() => caches.match(req, { ignoreSearch: true }).then((m) => m || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then((m) => m || fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; })));
});
