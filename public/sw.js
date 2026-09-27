/* SIGN TRAINER PWA service worker.
 * Team data and API responses are intentionally not cached here. The worker exists
 * so installed team PWAs launch as standalone apps while all sensitive data keeps
 * the existing online/session behavior.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  event.respondWith(fetch(request));
});
