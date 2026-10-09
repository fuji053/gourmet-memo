// グルメモ — offline support. Bump VERSION when files change so phones pick up the update.
const VERSION = 'gourmet-memo-v1';
const FONTS = VERSION + '-fonts';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './izakaya/', './izakaya/index.html', './kissa/', './kissa/index.html',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
  './splash/logo.png',
  './media/izakaya.jpg', './media/kissa.jpg',
  './media/bg-izakaya.jpg', './media/bg-izakaya.mp4', './media/bg-kissa.jpg', './media/bg-kissa.mp4',
];

self.addEventListener('install', e => {
  // cache what we can; a single missing file must not block the app from installing
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
      // network first so updates arrive; cached page when offline
      e.respondWith(
        fetch(req, {cache: 'no-store'}).then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
          return res;
        }).catch(() => caches.match(req, {ignoreSearch: true}).then(hit => hit || caches.match(new URL('index.html', req.url).href)))
      );
      return;
    }
    // video needs range requests: let the network handle it, fall back to cache offline
    if (url.pathname.endsWith('.mp4')) {
      e.respondWith(fetch(req).catch(() => caches.match(req, {ignoreSearch: true})));
      return;
    }
    e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req)));
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); c.put(req, res.clone()); return res; }
      catch { return Response.error(); }
    }));
  }
});
