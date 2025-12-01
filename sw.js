const CACHE_VERSION = "v1.0.0";
const CACHE_NAME = `parcela40-${CACHE_VERSION}`;

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  // Fonts
  "/fonts/lora-v35-latin-ext-regular.woff2",
  "/fonts/lora-v35-latin-ext-700.woff2",
  "/fonts/merriweather-v30-latin-ext-regular.woff2",
  "/fonts/merriweather-v30-latin-ext-700.woff2",
  "/fonts/montserrat-v26-latin-ext-regular.woff2",
  "/fonts/montserrat-v26-latin-ext-700.woff2",
  "/fonts/open-sans-v40-latin-ext-regular.woff2",
  "/fonts/open-sans-v40-latin-ext-700.woff2",
  // SVGs
  "/images/house.svg",
  "/pdf.svg",
  "/favicon/favicon-32x32.png",
  "/favicon/apple-touch-icon.png",
  "/favicon/site.webmanifest",
];

// PDFs to cache on demand
const PDF_PATTERN = /\.pdf$/;
const CDN_PATTERN = /cdn\.jsdelivr\.net/;

// Install event - precache essential assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(
            (name) => name.startsWith("parcela40-") && name !== CACHE_NAME
          )
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // CDN images: Cache-first (they're versioned with commit hash)
  if (CDN_PATTERN.test(request.url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // PDFs: Cache-first (large files, rarely change)
  if (PDF_PATTERN.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML: Network-first (ensure fresh content)
  if (request.headers.get("accept").includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Everything else: Cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
      );
    })
  );
});
