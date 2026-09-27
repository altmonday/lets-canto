// Minimal service worker: caches the app shell and pages the learner has opened,
// so a started lesson can be reopened on a flaky connection. API calls always go
// to the network (answers must reach the server).
const CACHE = "lets-canto-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/icon.svg"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/tts")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/api/tts")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) caches.open(CACHE).then((c) => c.put(request, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || Response.error())),
    );
  }
});
