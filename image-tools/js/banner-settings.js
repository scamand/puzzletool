(function () {
    var settingsBtn = null;
    var settingsModal = null;
    var settingsList = null;
    var activeEditingMode = null; // 正在编辑的模式: "白天" | "夜间" | null

    var BANNER_STORAGE_KEY = "image_tool_banner_settings";

    var DEFAULT_SETTINGS = {
        dayMode: { type: "solid", colorA: "#ffffff", colorB: "#ffffff" },
        nightMode: { type: "solid", colorA: "#1a1a2e", colorB: "#1a1a2e" },
        showGrid: true,
        dayPresets: [
            { type: "solid", colorA: "#ffffff", colorB: "#ffffff" },
            { type: "solid", colorA: "#f0f0f0", colorB: "#f0f0f0" },
            { type: "gradient", colorA: "#667eea", colorB: "#764ba2" }
        ],
        nightPresets: [
            { type: "solid", colorA: "#1a1a2e", colorB: "#1a1a2e" },
            { type: "solid", colorA: "#16213e", colorB: "#16213e" },
            { type: "gradient", colorA: "#0f0c29", colorB: "#302b63" }
        ]
    };

    function showToast(message) {
        var toast = document.getElementById("toast");
        if (toast) {
            toast.textContent = message;
            toast.classList.add("show");
            setTimeout(function () {
                toast.classList.remove("show");
            }, 1800);
        }
    }

    function loadBannerSettings() {
        try {
            var saved = window.localStorage.getItem(BANNER_STORAGE_KEY);
            if (saved) {
                var parsed = JSON.parse(saved);
                var st = window.ImageToolState;
                if (st && st.state && parsed) {
                    st.state.bannerSettings = parsed;
                }
            }
        } catch (e) {
            // Use defaults
        }
    }

    function saveBannerSettings() {
        try {
            var st = window.ImageToolState;
            if (st && st.state) {
                window.localStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(st.state.bannerSettings));
            }
        } catch (e) {
            showToast("保存失败，浏览器可能限制了本地存储");
        }
    }

    function getBannerSettings() {
        var st = window.ImageToolState;
        return st && st.state ? st.state.bannerSettings : DEFAULT_SETTINGS;
    }

    function isDayMode() {
        return document.documentElement.getAttribute("data-theme") !== "dark";
    }

    function applyBannerToCanvas() {
        var settings = getBannerSettings();
        var stage = document.getElementById("imageStage");
        if (!stage) return;

        // 优先使用正在编辑的模式，否则使用当前主题对应的模式
        var modeToApply;
        if (activeEditingMode === "白天") {
            modeToApply = settings.dayMode;
        } else if (activeEditingMode === "夜间") {
            modeToApply = settings.nightMode;
        } else {
            modeToApply = isDayMode() ? settings.dayMode : settings.nightMode;
        }

        if (settings.showGrid) {
            stage.style.background =
                "linear-gradient(90deg, color-mix(in srgb, var(--line) 46%, transparent) 1px, transparent 1px)," +
                "linear-gradient(0deg, color-mix(in srgb, var(--line) 46%, transparent) 1px, transparent 1px)," +
                getBannerGradient(modeToApply);
            stage.style.backgroundSize = "42px 42px, 42px 42px, auto";
        } else {
            stage.style.background = getBannerGradient(modeToApply);
            stage.style.backgroundSize = "auto";
        }
    }

    function getBannerGradient(mode) {
        if (mode.type === "gradient") {
            return "linear-gradient(to bottom, " + mode.colorA + ", " + mode.colorB + ")";
        }
        return mode.colorA;
    }

    function escapeHTML(str) {
        return String(str).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function isValidHex(str) {
        return /^#[0-9A-Fa-f]{6}$/.test(str);
    }

    function initColorSwatch(container, hexInput, onChangeFn) {
        container.style.background = hexInput.value;
        container.style.cursor = "pointer";

        var colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.style.opacity = "0";
        colorInput.style.position = "absolute";
        colorInput.style.width = "60px";
        colorInput.style.height = "60px";
        colorInput.style.cursor = "pointer";
        container.style.position = "relative";
        container.style.overflow = "visible";

        container.appendChild(colorInput);

        colorInput.addEventListener("input", function (e) {
            var val = e.target.value;
            hexInput.value = val.toUpperCase();
            container.style.background = val;
            onChangeFn(val);
        });

        container.addEventListener("click", function (e) {
            if (e.target !== colorInput) {
                colorInput.click();
            }
        });
    }

    function renderModeSection(mode, modeName, presets, settings) {
        var type = mode.type;
        var colorA = mode.colorA;
        var colorB = mode.colorB;
        var preview = type === "gradient"
            ? "linear-gradient(to bottom, " + colorA + ", " + colorB + ")"
            : colorA;

        return '<details class="settings-row" data-mode="' + modeName + '">' +
            '<summary>' +
            '<span class="settings-row-title">' + modeName + ' 模式</span>' +
            '<span class="settings-row-meta">' + (type === "solid" ? "纯色" : "渐变") + '</span>' +
            '</summary>' +
            '<div class="settings-row-body">' +
            '<div class="banner-mode-tabs">' +
            '<button class="banner-mode-tab ' + (type === "solid" ? "active" : "") + '" data-type="solid" type="button">纯色</button>' +
            '<button class="banner-mode-tab ' + (type === "gradient" ? "active" : "") + '" data-type="gradient" type="button">上下渐变</button>' +
            '</div>' +
            '<div class="banner-color-row">' +
            '<span class="banner-color-label">A</span>' +
            '<div class="banner-color-swatch" id="swatch-' + modeName + '-a"></div>' +
            '<input class="banner-hex-input" type="text" id="hex-' + modeName + '-a" value="' + escapeHTML(colorA) + '" placeholder="#ffffff" maxlength="7">' +
            '</div>' +
            (type === "gradient" ?
                '<div class="banner-color-row">' +
                '<span class="banner-color-label">B</span>' +
                '<div class="banner-color-swatch" id="swatch-' + modeName + '-b"></div>' +
                '<input class="banner-hex-input" type="text" id="hex-' + modeName + '-b" value="' + escapeHTML(colorB) + '" placeholder="#ffffff" maxlength="7">' +
                '</div>' : ''
            ) +
            '<div class="banner-gradient-preview" id="preview-' + modeName + '" style="background:' + escapeHTML(preview) + '"></div>' +
            '<div class="banner-presets-row">' +
            '<button class="banner-preset-btn" data-preset="0" type="button">预设1</button>' +
            '<button class="banner-preset-btn" data-preset="1" type="button">预设2</button>' +
            '<button class="banner-preset-btn" data-preset="2" type="button">预设3</button>' +
            '<button class="banner-save-preset-btn" type="button">保存当前</button>' +
            '</div>' +
            '<div class="banner-reset-row">' +
            '<button class="banner-reset-btn" type="button">恢复默认</button>' +
            '</div>' +
            '</div>' +
            '</details>';
    }

    function renderGridSection(settings) {
        return '<details class="settings-row" data-section="grid">' +
            '<summary>' +
            '<span class="settings-row-title">网格设置</span>' +
            '<span class="settings-row-meta">' + (settings.showGrid ? "显示" : "隐藏") + '</span>' +
            '</summary>' +
            '<div class="settings-row-body">' +
            '<div class="banner-grid-toggle">' +
            '<input type="checkbox" id="gridToggle" ' + (settings.showGrid ? "checked" : "") + '>' +
            '<span>显示网格</span>' +
            '</div>' +
            '<div class="banner-reset-row">' +
            '<button class="banner-reset-btn" type="button">恢复默认</button>' +
            '</div>' +
            '</div>' +
            '</details>';
    }

    function getOpenStates() {
        var states = {};
        if (!settingsList) return states;
        var details = settingsList.querySelectorAll("details");
        details.forEach(function (d) {
            states[d.dataset.mode || d.dataset.section] = d.hasAttribute("open");
        });
        return states;
    }

    function restoreOpenStates(states) {
        if (!settingsList) return;
        var details = settingsList.querySelectorAll("details");
        details.forEach(function (d) {
            var key = d.dataset.mode || d.dataset.section;
            if (states[key]) {
                d.setAttribute("open", "");
            } else {
                d.removeAttribute("open");
            }
        });
    }

    function renderBannerSettings() {
        if (!settingsList) return;

        // 保存展开状态
        var openStates = getOpenStates();

        var settings = getBannerSettings();
        var dayPresets = settings.dayPresets || DEFAULT_SETTINGS.dayPresets;
        var nightPresets = settings.nightPresets || DEFAULT_SETTINGS.nightPresets;

        settingsList.innerHTML =
            renderModeSection(settings.dayMode, "白天", dayPresets, settings) +
            renderModeSection(settings.nightMode, "夜间", nightPresets, settings) +
            renderGridSection(settings);

        // 恢复展开状态
        restoreOpenStates(openStates);

        bindEvents(settings);
    }

    function bindEvents(settings) {
        // 绑定白天模式事件
        bindModeEvents("白天", settings.dayMode, settings.dayPresets);

        // 绑定夜间模式事件
        bindModeEvents("夜间", settings.nightMode, settings.nightPresets);

        // 绑定网格开关
        var gridToggle = document.getElementById("gridToggle");
        if (gridToggle) {
            gridToggle.addEventListener("change", function () {
                var st = window.ImageToolState;
                if (st && st.state) {
                    st.state.bannerSettings.showGrid = this.checked;
                    saveBannerSettings();
                    applyBannerToCanvas();
                }
            });
        }

        // 绑定网格恢复默认
        var gridSection = document.querySelector('[data-section="grid"]');
        if (gridSection) {
            var gridResetBtn = gridSection.querySelector(".banner-reset-btn");
            if (gridResetBtn) {
                gridResetBtn.addEventListener("click", function () {
                    var st = window.ImageToolState;
                    if (st && st.state) {
                        st.state.bannerSettings.showGrid = DEFAULT_SETTINGS.showGrid;
                        saveBannerSettings();
                        renderBannerSettings();
                        applyBannerToCanvas();
                        showToast("网格设置已恢复默认");
                    }
                });
            }
        }
    }

    function bindModeEvents(modeName, mode, presets) {
        var section = document.querySelector('[data-mode="' + modeName + '"]');
        if (!section) return;

        // 颜色块A
        var swatchA = document.getElementById("swatch-" + modeName + "-a");
        var hexA = document.getElementById("hex-" + modeName + "-a");
        if (swatchA && hexA) {
            initColorSwatch(swatchA, hexA, function (val) {
                setModeColor(modeName, "colorA", val);
                updatePreview(modeName);
                setActiveEditingMode(modeName);
                applyBannerToCanvas();
            });
        }

        // 颜色块B
        var swatchB = document.getElementById("swatch-" + modeName + "-b");
        var hexB = document.getElementById("hex-" + modeName + "-b");
        if (swatchB && hexB) {
            initColorSwatch(swatchB, hexB, function (val) {
                setModeColor(modeName, "colorB", val);
                updatePreview(modeName);
                setActiveEditingMode(modeName);
                applyBannerToCanvas();
            });
        }

        // Hex输入A
        if (hexA) {
            hexA.addEventListener("change", function () {
                var val = this.value.trim();
                if (isValidHex(val)) {
                    setModeColor(modeName, "colorA", val);
                    saveBannerSettings();
                    updatePreview(modeName);
                    setActiveEditingMode(modeName);
                    applyBannerToCanvas();
                }
            });
        }

        // Hex输入B
        if (hexB) {
            hexB.addEventListener("change", function () {
                var val = this.value.trim();
                if (isValidHex(val)) {
                    setModeColor(modeName, "colorB", val);
                    saveBannerSettings();
                    updatePreview(modeName);
                    setActiveEditingMode(modeName);
                    applyBannerToCanvas();
                }
            });
        }

        // 类型切换
        var tabs = section.querySelectorAll(".banner-mode-tab");
        tabs.forEach(function (tab) {
            tab.addEventListener("click", function () {
                var type = this.dataset.type;
                var st = window.ImageToolState;
                if (!st || !st.state) return;

                var targetMode = modeName === "白天" ? st.state.bannerSettings.dayMode : st.state.bannerSettings.nightMode;
                targetMode.type = type;
                saveBannerSettings();
                setActiveEditingMode(modeName);
                renderBannerSettings();
                applyBannerToCanvas();
            });
        });

        // 预设按钮
        var presetBtns = section.querySelectorAll(".banner-preset-btn");
        presetBtns.forEach(function (btn) {
            btn.addEventListener("click", function () {
                var idx = parseInt(this.dataset.preset, 10);
                var preset = presets[idx];
                if (preset) {
                    applyPresetToMode(modeName, preset);
                }
            });
        });

        // 保存当前按钮
        var saveBtn = section.querySelector(".banner-save-preset-btn");
        if (saveBtn) {
            saveBtn.addEventListener("click", function () {
                saveCurrentToPreset(modeName);
            });
        }

        // 恢复默认按钮
        var resetBtn = section.querySelector(".banner-reset-btn");
        if (resetBtn) {
            resetBtn.addEventListener("click", function () {
                resetModeToDefault(modeName);
            });
        }
    }

    function setActiveEditingMode(modeName) {
        activeEditingMode = modeName;
    }

    function setModeColor(modeName, key, value) {
        var st = window.ImageToolState;
        if (!st || !st.state) return;

        var targetMode = modeName === "白天" ? st.state.bannerSettings.dayMode : st.state.bannerSettings.nightMode;
        if (key === "colorA") {
            targetMode.colorA = value;
        } else if (key === "colorB") {
            targetMode.colorB = value;
        }
    }

    function updatePreview(modeName) {
        var st = window.ImageToolState;
        if (!st || !st.state) return;

        var targetMode = modeName === "白天" ? st.state.bannerSettings.dayMode : st.state.bannerSettings.nightMode;
        var preview = document.getElementById("preview-" + modeName);
        if (preview) {
            if (targetMode.type === "gradient") {
                preview.style.background = "linear-gradient(to bottom, " + targetMode.colorA + ", " + targetMode.colorB + ")";
            } else {
                preview.style.background = targetMode.colorA;
            }
        }
    }

    function applyPresetToMode(modeName, preset) {
        var st = window.ImageToolState;
        if (!st || !st.state) return;

        var targetMode = modeName === "白天" ? st.state.bannerSettings.dayMode : st.state.bannerSettings.nightMode;
        targetMode.type = preset.type;
        targetMode.colorA = preset.colorA;
        targetMode.colorB = preset.colorB;

        saveBannerSettings();
        setActiveEditingMode(modeName);
        renderBannerSettings();
        applyBannerToCanvas();
        showToast(modeName + "模式已应用预设");
    }

    function saveCurrentToPreset(modeName) {
        var st = window.ImageToolState;
        if (!st || !st.state) return;

        var targetMode = modeName === "白天" ? st.state.bannerSettings.dayMode : st.state.bannerSettings.nightMode;
        var targetPresets = modeName === "白天" ? st.state.bannerSettings.dayPresets : st.state.bannerSettings.nightPresets;

        var current = {
            type: targetMode.type,
            colorA: targetMode.colorA,
            colorB: targetMode.colorB
        };

        // 查找是否有相同预设
        var sameIndex = -1;
        for (var i = 0; i < 3; i++) {
            var p = targetPresets[i];
            if (p.type === current.type && p.colorA === current.colorA && p.colorB === current.colorB) {
                sameIndex = i;
                break;
            }
        }

        // 找空位
        var slot = sameIndex;
        if (slot === -1) {
            for (var j = 0; j < 3; j++) {
                var p2 = targetPresets[j];
                if (p2.type !== current.type || p2.colorA !== current.colorA || p2.colorB !== current.colorB) {
                    slot = j;
                    break;
                }
            }
        }
        if (slot === -1) slot = 0;

        targetPresets[slot] = current;
        saveBannerSettings();
        renderBannerSettings();
        showToast("已保存到预设" + (slot + 1));
    }

    function resetModeToDefault(modeName) {
        var st = window.ImageToolState;
        if (!st || !st.state) return;

        var defaults = modeName === "白天" ? DEFAULT_SETTINGS.dayMode : DEFAULT_SETTINGS.nightMode;
        var targetMode = modeName === "白天" ? st.state.bannerSettings.dayMode : st.state.bannerSettings.nightMode;

        targetMode.type = defaults.type;
        targetMode.colorA = defaults.colorA;
        targetMode.colorB = defaults.colorB;

        saveBannerSettings();
        renderBannerSettings();
        applyBannerToCanvas();
        showToast(modeName + "模式已恢复默认");
    }

    function openSettings() {
        loadBannerSettings();
        activeEditingMode = null;
        renderBannerSettings();
        if (settingsModal) {
            settingsModal.classList.add("show");
        }
    }

    function closeSettingsModal() {
        activeEditingMode = null;
        if (settingsModal) {
            settingsModal.classList.remove("show");
        }
        applyBannerToCanvas(); // 关闭时恢复应用当前主题的设置
    }

    function init() {
        settingsBtn = document.getElementById("imageSettingsBtn");
        settingsModal = document.getElementById("imageSettingsModal");
        settingsList = document.getElementById("bannerSettingsList");

        if (!settingsBtn || !settingsModal) return;

        settingsBtn.addEventListener("click", openSettings);

        settingsModal.addEventListener("click", function (e) {
            if (e.target === settingsModal) {
                closeSettingsModal();
            }
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && settingsModal.classList.contains("show")) {
                closeSettingsModal();
            }
        });

        loadBannerSettings();
        applyBannerToCanvas();

        var themeObserver = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.attributeName === "data-theme") {
                    activeEditingMode = null; // 切换主题时清除编辑状态
                    applyBannerToCanvas();
                }
            });
        });
        themeObserver.observe(document.documentElement, { attributes: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    window.ImageBannerSettings = {
        applyBannerToCanvas: applyBannerToCanvas,
        loadBannerSettings: loadBannerSettings,
        openSettings: openSettings
    };
})();
