// Service Worker - No caching strategy
// This service worker enables PWA installability without caching any resources.

self.addEventListener("install", (event) => {
  // Activate immediately, skip waiting
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Network-only: always go to the network, no caching
  return;
});
