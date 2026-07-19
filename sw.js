/* Dead Line — service worker for offline play + install-to-home-screen */
const CACHE = "deadline-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/game.js",
  "./manifest.webmanifest",
  "./assets/sprites/atlas.js",
  "./assets/sprites/player.png",
  "./assets/sprites/allies.png",
  "./assets/sprites/zombies.png",
  "./assets/sprites/weapons.png",
  "./assets/sprites/powerups.png",
  "./assets/maps/map_city.jpg",
  "./assets/maps/map_forest.jpg",
  "./assets/maps/map_bridge.jpg",
  "./assets/maps/map_subway.jpg",
  "./assets/maps/map_factory.jpg",
  "./assets/maps/map_military.jpg",
  "./assets/maps/map_sewer.jpg",
  "./assets/maps/map_hospital.jpg",
  "./assets/maps/map_helipad.jpg",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return (
        cached ||
        fetch(e.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
            return res;
          })
          .catch(() => cached)
      );
    })
  );
});
