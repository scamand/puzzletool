(function () {
    const MANUAL_OVERRIDE_KEY = "theme_manual_override";
    const DAY_THEME = "light";
    const NIGHT_THEME = "dark";

    function isNightTime(date = new Date()) {
        const hour = date.getHours();
        return hour >= 19 || hour < 7;
    }

    function readManualOverride() {
        try {
            const value = window.localStorage.getItem(MANUAL_OVERRIDE_KEY);
            return value === DAY_THEME || value === NIGHT_THEME ? value : null;
        } catch (_) {
            return null;
        }
    }

    function writeManualOverride(theme) {
        try {
            window.localStorage.setItem(MANUAL_OVERRIDE_KEY, theme);
        } catch (_) {
            // ignore
        }
    }

    function resolveTheme() {
        const manual = readManualOverride();
        if (manual) return manual;
        return isNightTime() ? NIGHT_THEME : DAY_THEME;
    }

    function normalizeTheme(theme) {
        return theme === NIGHT_THEME ? NIGHT_THEME : DAY_THEME;
    }

    function applyTheme(theme) {
        const normalized = normalizeTheme(theme);
        document.documentElement.setAttribute("data-theme", normalized);
        if (document.body) {
            document.body.setAttribute("data-theme", normalized);
        }
        return normalized;
    }

    function updateToggleState(toggleEl, theme) {
        if (!toggleEl) return;
        toggleEl.setAttribute("aria-pressed", String(theme === NIGHT_THEME));
        toggleEl.setAttribute("title", theme === NIGHT_THEME ? "切换到白天模式" : "切换到夜晚模式");
    }

    function initThemeManager(options) {
        const opts = options || {};
        const allowToggle = Boolean(opts.allowToggle);
        const toggleSelector = opts.toggleSelector || "#themeToggle";
        let activeTheme = applyTheme(resolveTheme());

        const toggleEl = allowToggle ? document.querySelector(toggleSelector) : null;
        updateToggleState(toggleEl, activeTheme);

        if (toggleEl) {
            toggleEl.addEventListener("click", function () {
                activeTheme = activeTheme === NIGHT_THEME ? DAY_THEME : NIGHT_THEME;
                activeTheme = applyTheme(activeTheme);
                writeManualOverride(activeTheme);
                updateToggleState(toggleEl, activeTheme);
            });
        }

        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState !== "visible") return;
            if (readManualOverride() !== null) return;
            activeTheme = applyTheme(resolveTheme());
            updateToggleState(toggleEl, activeTheme);
        });

        window.addEventListener("storage", function (event) {
            if (event.key !== MANUAL_OVERRIDE_KEY) return;
            activeTheme = applyTheme(resolveTheme());
            updateToggleState(toggleEl, activeTheme);
        });

        return {
            getTheme: function () {
                return activeTheme;
            },
            setTheme: function (theme, remember) {
                activeTheme = applyTheme(theme);
                if (remember !== false) writeManualOverride(activeTheme);
                updateToggleState(toggleEl, activeTheme);
            },
            clearManualOverride: function () {
                try {
                    window.localStorage.removeItem(MANUAL_OVERRIDE_KEY);
                } catch (_) {
                    // ignore
                }
                activeTheme = applyTheme(resolveTheme());
                updateToggleState(toggleEl, activeTheme);
            }
        };
    }

    window.initThemeManager = initThemeManager;
    window.THEME_MANUAL_OVERRIDE_KEY = MANUAL_OVERRIDE_KEY;
})();
