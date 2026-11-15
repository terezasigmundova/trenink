// Offline cache aplikace. Při změně kódu zvyš VERZE.
// prefix obsahuje cestu, aby se nepletly cache jiných stránek na stejné doméně
const PREFIX = 'trenink:' + new URL(self.registration.scope).pathname + ':';
const VERZE = PREFIX + 'v10';
const SOUBORY = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERZE).then(c => c.addAll(SOUBORY)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n.startsWith(PREFIX) && n !== VERZE).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // Síť napřed (nová verze appky), ale nejdéle 3 s; bez signálu z cache.
  const nav = e.request.mode === 'navigate';
  const zCache = () => caches.open(VERZE).then(c => c.match(e.request, { ignoreSearch: true }).then(r => r || (nav ? c.match('./index.html') : undefined)));
  e.respondWith(new Promise(resolve => {
    let hotovo = false;
    const t = setTimeout(() => { zCache().then(r => { if (r && !hotovo) { hotovo = true; resolve(r); } }); }, 3000);
    fetch(e.request).then(r => {
      if (r.ok) { const k = r.clone(); caches.open(VERZE).then(c => c.put(e.request, k)); if (!hotovo) { hotovo = true; clearTimeout(t); resolve(r); } return; }
      // chyba serveru: radši verze z cache, pokud je
      clearTimeout(t); zCache().then(c => { if (!hotovo) { hotovo = true; resolve(c || r); } });
    }).catch(() => { clearTimeout(t); zCache().then(r => { if (!hotovo) { hotovo = true; resolve(r || Response.error()); } }); });
  }));
});
