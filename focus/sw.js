/* Florin focus group test: the service worker. It makes the site installable on Android and opens the app without a
   connection once it has loaded. The app's files are cached when the worker installs (build.js lists them here and
   stamps the build); index.html and config.js come from the network first, so a closed study or a new config takes
   effect on the next open. Nothing from another site is ever cached: the answers go to Google's script, never here. */
const BUILD = "dev";
const SHELL = [/*SHELL*/];
const CACHE = `florin-focus-${BUILD}`;
const FRESH = /\/(index\.html|config\.js)?$/;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.indexOf("florin-focus-") === 0 && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const nav = req.mode === "navigate";
  if (nav || FRESH.test(url.pathname)) {
    /* network first: the newest page and settings, the cached ones when offline */
    e.respondWith(fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(nav ? new Request(url.pathname) : req, copy)); }
      return res;
    }).catch(() => caches.match(nav ? url.pathname : req, { ignoreSearch: true })
      .then((r) => r || (nav ? caches.match("./", { ignoreSearch: true }) : null))
      .then((r) => r || (nav ? caches.match("index.html", { ignoreSearch: true }) : null))
      .then((r) => r || new Response("Florin needs a connection to open the first time.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }))));
    return;
  }
  /* the app shell: from the cache, else the network */
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req)));
});
