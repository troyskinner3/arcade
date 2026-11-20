/* Noodle works offline: the page and its files are kept on the device. The page itself is fetched fresh when there is a connection (so updates arrive), and from the copy when there isn't. */
const CACHE = 'noodle-v4';
const CORE = ['./', 'index.html', 'reader.json', 'musical.json', 'vendor/mp4-muxer.min.js', 'vendor/fonts/fonts.css',
  'vendor/fonts/Unbounded-700-latin.woff2', 'vendor/fonts/Unbounded-700-latin-ext.woff2',
  'vendor/fonts/Barlow-400-latin.woff2', 'vendor/fonts/Barlow-400-latin-ext.woff2', 'vendor/fonts/Barlow-500-latin.woff2', 'vendor/fonts/Barlow-500-latin-ext.woff2', 'vendor/fonts/Barlow-600-latin.woff2', 'vendor/fonts/Barlow-600-latin-ext.woff2', 'vendor/fonts/Barlow-700-latin.woff2', 'vendor/fonts/Barlow-700-latin-ext.woff2', 'vendor/fonts/BarlowSemiCondensed-500-latin.woff2', 'vendor/fonts/BarlowSemiCondensed-500-latin-ext.woff2', 'vendor/fonts/BarlowSemiCondensed-600-latin.woff2', 'vendor/fonts/BarlowSemiCondensed-600-latin-ext.woff2', 'vendor/fonts/BarlowSemiCondensed-700-latin.woff2', 'vendor/fonts/BarlowSemiCondensed-700-latin-ext.woff2'];
/* The page's stylesheet and scripts carry a hash of their contents (?v=..., stamp.sh), so a new version is a new URL: kept copies are never stale. */
const pageFiles = () => fetch('index.html', { cache: 'no-store' }).then((r) => r.text()).then((h) => [...h.matchAll(/(?:src|href)="((?:js\/[\w-]+\.js|app\.css)\?v=[0-9a-f]+)"/g)].map((m) => m[1])).catch(() => []);
self.addEventListener('install', (e) => { e.waitUntil(Promise.all([caches.open(CACHE), pageFiles()]).then(([c, files]) => Promise.all(CORE.concat(files).map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
/* old versions of the scripts are dropped once a new page has loaded its own (the page posts 'prune' after it starts) */
self.addEventListener('message', (e) => { if (e.data !== 'prune') return;
  e.waitUntil(Promise.all([caches.open(CACHE), pageFiles()]).then(([c, files]) => files.length && c.keys().then((ks) => Promise.all(ks.filter((k) => { const u = new URL(k.url); return /\/(js\/[\w-]+\.js|app\.css)$/.test(u.pathname) && !files.some((f) => k.url.endsWith(f)); }).map((k) => c.delete(k)))))); });
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
