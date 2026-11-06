/* Offline support: app shell cached, refreshed in the background (stale-while-revalidate). Bump CACHE after big changes. */
const CACHE = 'tracker-v19';
const SHELL = ['./', 'index.html', 'pages/dashboard.html', 'pages/assignments.html', 'pages/courses.html', 'pages/timetable.html', 'assets/manifest.webmanifest', 'assets/icon.svg',
  'css/style.css', 'css/assignments.css', 'css/timetable.css', 'css/dark.css', 'js/data.js', 'js/app.js', 'js/auth.js', 'js/dashboard.js', 'js/assignments.js', 'js/courses.js', 'js/timetable.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
