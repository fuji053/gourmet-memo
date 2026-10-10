// Stash — offline support. Bump VERSION when files change so phones pick up the update.
const VERSION = 'gurumemo-v19';
const FONTS = VERSION + '-fonts';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './js/config.js', './js/core.js', './js/form.js', './js/detail.js', './js/links.js', './js/google.js', './js/video.js', './js/search.js', './js/map.js', './js/views.js', './js/main.js',
  './vendor/leaflet.js', './vendor/leaflet.css', './vendor/maplibre-gl.js', './vendor/maplibre-gl.css',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
  './fonts/stash-logo.woff2',
  './media/izakaya.jpg', './media/kissa.jpg',
  './media/bg-izakaya.jpg', './media/bg-izakaya.mp4', './media/bg-kissa.jpg', './media/bg-kissa.mp4',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    if (req.mode === 'navigate') {
      e.respondWith(
        fetch(req, {cache: 'no-store'}).then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
          return res;
        }).catch(() => caches.match(req, {ignoreSearch: true}).then(hit => hit || caches.match(new URL('./', self.registration.scope).href)))
      );
      return;
    }
    if (url.pathname.endsWith('.mp4')) {
      e.respondWith(fetch(req).catch(() => caches.match(req, {ignoreSearch: true})));
      return;
    }
    // app files: network first (fresh after an update), cache when offline
    e.respondWith(fetch(req, {cache: 'no-cache'}).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, {ignoreSearch: true})));
    return;
  }

  // fonts are cached; map tiles (国土地理院) are always loaded live as their terms require
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); c.put(req, res.clone()); return res; }
      catch { return Response.error(); }
    }));
  }
});
