const CACHE = "builder-quest-v3";
const CORE = ["./", "./index.html"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  const sameOrigin = u.origin === location.origin;
  const firebaseSdk = u.hostname === "www.gstatic.com" && u.pathname.startsWith("/firebasejs/");
  if (!sameOrigin && !firebaseSdk) return;   /* Firestore traffic is never touched */

  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(r, { ignoreSearch: true });
    const net = fetch(r).then(res => {
      if (res && (res.ok || res.type === "opaque")) cache.put(r, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }          /* cache first, refresh in background */
    const res = await net;
    if (res) return res;
    if (r.mode === "navigate") return (await cache.match("./index.html")) || (await cache.match("./")) || Response.error();
    return Response.error();
  }));
});
