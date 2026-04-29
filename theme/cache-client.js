(function () {
    const currentScript = document.currentScript;
    if (!currentScript || !("serviceWorker" in navigator)) return;

    const appRoot = new URL("../", currentScript.src);
    const serviceWorkerUrl = new URL("sw.js", appRoot);
    const warmPaths = [
        "",
        "index.html",
        "theme/light-theme.css",
        "theme/dark-theme.css",
        "theme/common-styles.css",
        "theme/theme-system.js",
        "theme/cache-client.js",
        "things/puzzle.svg",
        "things/shift-icon.svg",
        "things/cipher-icon.svg",
        "things/fixed-icon.svg",
        "text-tools/shift-cipher.html",
        "text-tools/cipher-table.html",
        "text-tools/fixed-cipher.html",
        "text-tools/fixed-tools/fixed-tools.bundle.js"
    ];

    function appUrl(path) {
        return new URL(path, appRoot).href;
    }

    function idle(callback) {
        if ("requestIdleCallback" in window) {
            window.requestIdleCallback(callback, { timeout: 1800 });
            return;
        }
        window.setTimeout(callback, 600);
    }

    function warmCache(registration, urls) {
        const worker = registration.active || registration.waiting || registration.installing;
        if (worker) {
            worker.postMessage({ type: "WARM_CACHE", urls });
        }
    }

    function warmLink(link) {
        if (!link || link.dataset.prefetched === "true") return;
        const href = link.getAttribute("href");
        if (!href || href.startsWith("#")) return;

        const url = new URL(href, document.baseURI);
        if (url.origin !== location.origin || !url.href.startsWith(appRoot.href)) return;

        link.dataset.prefetched = "true";
        fetch(url.href, { cache: "force-cache" }).catch(() => {});
    }

    window.addEventListener("load", () => {
        navigator.serviceWorker.register(serviceWorkerUrl.href)
            .then((registration) => {
                idle(() => warmCache(registration, warmPaths.map(appUrl)));
            })
            .catch(() => {});

        document.querySelectorAll("a[href]").forEach((link) => {
            link.addEventListener("pointerenter", () => warmLink(link), { once: true });
            link.addEventListener("focus", () => warmLink(link), { once: true });
            link.addEventListener("touchstart", () => warmLink(link), { once: true, passive: true });
        });
    });
})();
