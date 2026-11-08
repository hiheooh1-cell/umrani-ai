/* ==========================================================
   Umrani AI — service worker (offline app shell)
   ----------------------------------------------------------
   Goal: after the first online visit, the app shell is cached
   locally, so the site still OPENS when the internet drops and
   the visitor's saved chats (IndexedDB, untouched by this
   worker) remain visible.

   Strategy:
   - Navigations / index.html: network-first, falling back to
     the cached copy (new deploys arrive when online; offline
     still opens the last known shell).
   - Other same-origin GET assets: cache-first, populated from
     the network on first fetch.
   - Cross-origin requests (AI provider APIs, Gemini, the ad
     network, CDNs) are NEVER intercepted or cached — they pass
     through untouched and simply fail on their own offline.

   Bump CACHE_NAME on every release that changes the shell so
   activate() can delete the previous cache.
   ========================================================== */
"use strict";

const CACHE_NAME = "umrani-shell-v11";

const APP_SHELL = [
  "./",
  "index.html",
  "styles/main.css",
  "dist/app.bundle.js",
  "assets/brand-logo.png",
  "assets/brand-mark.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Cross-origin traffic is not our business: let it go to the
  // network directly (and fail naturally when offline).
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first so a fresh deploy wins when the
  // visitor is online; the cached shell keeps the app open when
  // the connection is gone.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const fresh = await fetch(request);
          if (fresh && fresh.ok) {
            cache.put("index.html", fresh.clone());
          }
          return fresh;
        } catch (err) {
          const cached = await cache.match("index.html", {
            ignoreSearch: true,
          });
          if (cached) return cached;
          throw err;
        }
      })()
    );
    return;
  }

  // Same-origin static assets (CSS, bundle, images): cache-first.
  // The page references some of them with a "?v=" query string, so
  // cache lookups ignore the search part.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      const fresh = await fetch(request);
      if (fresh && fresh.ok) {
        cache.put(request, fresh.clone());
      }
      return fresh;
    })()
  );
});
