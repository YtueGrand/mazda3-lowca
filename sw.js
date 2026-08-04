/* Service worker — app shell cache + zawsze swieze listings.json.
   Push obsluzymy w kolejnym etapie (Web Push / VAPID). */
const CACHE = "m3-lowca-v3";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // listings.json: ZAWSZE z sieci, nigdy z cache (gwarancja swiezych ofert).
  if (url.pathname.endsWith("listings.json")) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Reszta (shell): siec-first, cache tylko jako fallback offline.
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request))
  );
});

/* --- szkielet pod przyszle powiadomienia push --- */
self.addEventListener("push", e => {
  let data = {};
  try { data = e.data.json(); } catch (_) {}
  const title = data.title || "Nowa Mazda 3!";
  e.waitUntil(self.registration.showNotification(title, {
    body: data.body || "",
    icon: "icon.svg",
    badge: "icon.svg",
    data: { url: data.url || "./" }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url || "./"));
});
