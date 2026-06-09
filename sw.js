const CACHE_VERSION = "puzzletool-v7";
const APP_CACHE = `${CACHE_VERSION}-app`;

const PRECACHE_URLS = [
    "./",
    "./index.html",
    "./styles.css",
    "./theme/light-theme.css",
    "./theme/dark-theme.css",
    "./theme/common-styles.css",
    "./theme/theme-system.js",
    "./theme/cache-client.js",
    "./things/puzzle.svg",
    "./things/text-icon.svg",
    "./text-tools/text-tools.html",
    "./text-tools/text-tools.css",
    "./text-tools/tools/bundle.js",
    "./image-tools/image-tools.html",
    "./image-tools/image-tools.css",
    "./image-tools/js/state.js",
    "./image-tools/js/history.js",
    "./image-tools/js/app.js",
    "./image-tools/js/interactions/clipboard.js",
    "./image-tools/js/interactions/select-move-resize.js",
    "./image-tools/js/interactions/context-menu.js",
    "./image-tools/js/color/binary.js",
    "./image-tools/js/color/filter-controls.js",
    "./image-tools/js/color/color-panel.js"
];

function sameAppUrl(url) {
    return url.origin === self.location.origin && url.href.startsWith(self.registration.scope);
}

async function cacheUrls(urls) {
    const cache = await caches.open(APP_CACHE);
    const uniqueUrls = [...new Set(urls)];
    await Promise.allSettled(
        uniqueUrls.map(async (url) => {
            const response = await fetch(url, { cache: "reload" });
            if (response && response.ok) {
                await cache.put(url, response);
            }
        })
    );
}

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(APP_CACHE)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== APP_CACHE).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("message", (event) => {
    if (!event.data || event.data.type !== "WARM_CACHE" || !Array.isArray(event.data.urls)) return;
    const urls = event.data.urls.filter((value) => {
        try {
            return sameAppUrl(new URL(value));
        } catch (_) {
            return false;
        }
    });
    event.waitUntil(cacheUrls(urls));
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (!sameAppUrl(url)) return;

    event.respondWith(
        caches.open(APP_CACHE).then(async (cache) => {
            const cached = await cache.match(request);
            const networkFetch = fetch(request)
                .then((response) => {
                    if (response && response.ok) {
                        cache.put(request, response.clone());
                    }
                    return response;
                })
                .catch(() => cached);

            return cached || networkFetch;
        })
    );
});
