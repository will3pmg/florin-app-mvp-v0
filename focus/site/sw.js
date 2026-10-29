/* Florin focus group test: the service worker. It makes the site installable on Android and opens the app without a
   connection once it has loaded. The app's files are cached when the worker installs (build.js lists them here and
   stamps the build); index.html and config.js come from the network first, so a closed study or a new config takes
   effect on the next open. Nothing from another site is ever cached: the answers go to Google's script, never here. */
const BUILD = "fg.20261029.e03802a7";
const SHELL = ["./","index.html","app.html","proto/css/app.css","proto/js/lib.js","proto/js/data-app.js","proto/js/refresh-data.js","proto/css/refresh.css","proto/css/look-rings.css","proto/css/look-journal.css","proto/css/look-bento.css","proto/css/look-oura.css","proto/css/look-easy.css","proto/css/refresh-looks.css","proto/css/refresh-variants.css","proto/css/refresh-profile.css","proto/css/refresh-ask.css","proto/css/refresh-easy.css","proto/css/home-options.css","proto/js/claims-rules.js","proto/js/app-charts.js","proto/js/refresh-ui.js","proto/js/refresh-insights.js","proto/js/looks-data.js","proto/js/look-rings.js","proto/js/look-journal.js","proto/js/look-bento.js","proto/js/look-oura.js","proto/js/look-easy.js","proto/js/refresh-looks.js","proto/js/refresh-variants.js","proto/js/refresh-profile.js","proto/js/refresh-ask.js","proto/js/refresh-easy.js","proto/js/home-options.js","proto/js/refresh-app.js","config.js","manifest.webmanifest","css/focus-app.css","css/focus-tokens.css","css/focus.css","css/fx-base.css","js/flow.js","js/focus-ext.js","js/focus-week.js","js/focus.js","js/fx-comment.js","js/qr.js","js/questions.js","fonts/dm-sans-italic-latin.woff2","fonts/dm-sans-normal-latin.woff2","fonts/fonts.css","fonts/lora-italic-latin.woff2","fonts/lora-normal-latin.woff2","fonts/space-mono-normal-400-latin.woff2","fonts/space-mono-normal-700-latin.woff2","icons/apple-touch-icon.png","icons/favicon-32.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","icons/icon-maskable.svg","icons/icon.svg"];
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
