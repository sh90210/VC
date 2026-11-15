// Keeps the app working offline. App files load from the phone first and refresh in the background;
// score data always tries the internet first and falls back to the last copy it saved.
// "__BUILD__" is replaced with a new number on every deploy, which refreshes the saved app files.
const BUILD = '__BUILD__';
const CACHE = `score-hub-${BUILD}`;
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'js/app.js', 'js/config.js', 'js/ui.js', 'js/favs.js', 'js/golf-data.js',
  'js/views/golf/live.js', 'js/views/golf/schedule.js', 'js/views/golf/course.js', 'js/views/golf/stats.js',
  'js/views/soccer/common.js', 'js/views/soccer/overview.js', 'js/views/soccer/results.js',
  'js/views/soccer/table.js', 'js/views/soccer/stats.js', 'js/views/soccer/bracket.js',
  'icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('score-hub-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const saved = await cache.match(request);
    if (saved) return saved;
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(request);
  const update = fetch(request).then((res) => {
    if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
    return res;
  }).catch(() => saved);
  return saved || update;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (/site\.(web\.)?api\.espn\.com$/.test(url.hostname)) return; // live golf scores: always straight from the internet
  if (url.origin === self.location.origin) {
    event.respondWith(url.pathname.includes('/data/') ? networkFirst(request) : staleWhileRevalidate(request));
  } else if (/fonts\.(googleapis|gstatic)\.com$|crests\.football-data\.org$|a\.espncdn\.com$/.test(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
