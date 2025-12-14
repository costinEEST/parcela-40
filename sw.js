const CACHE_VERSION = "v2";
const CACHE_NAME = `parcela40-${CACHE_VERSION}`;

const OFFLINE_URL = "/offline.html";

// Only local files that MUST exist
const PRECACHE = ["/", "/index.html", OFFLINE_URL];

// Patterns
const CDN = /cdn\.jsdelivr\.net/;
const FONT = /\.(woff2?|ttf|otf)$/i;
const IMAGE = /\.(png|jpg|jpeg|svg|avif|webp)$/i;
const PDF = /\.pdf$/i;

/* ---------------- INSTALL ---------------- */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

/* ---------------- ACTIVATE ---------------- */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("parcela40-") && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

/* ---------------- FETCH ---------------- */

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Ignore non-GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  /* ---------- HTML (network-first + offline) ---------- */
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  /* ---------- Fonts (cache-first, critical for LCP) ---------- */
  if (FONT.test(url.pathname)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  /* ---------- CDN assets: images + PDFs ---------- */
  if (
    CDN.test(req.url) &&
    (IMAGE.test(url.pathname) || PDF.test(url.pathname))
  ) {
    event.respondWith(cacheFirst(req));
    return;
  }

  /* ---------- Default ---------- */
  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});

/* ---------------- Helpers ---------------- */

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;

    return fetch(request).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(request, copy));
      }
      return res;
    });
  });
}
