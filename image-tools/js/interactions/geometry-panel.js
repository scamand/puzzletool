(function () {
    const fieldNames = ["center-x", "center-y", "rotation", "width", "height"];
    const blockedKeys = new Set([".", ",", "e", "E", "+"]);
    let editingField = null;
    let aspectRatio = 1;
    let syncing = false;

    function toInteger(value, fallback) {
        const parsed = Number(value);
        return Math.round(Number.isFinite(parsed) ? parsed : fallback);
    }

    function normalizeRotation(value) {
        const normalized = value % 360;
        return normalized < 0 ? normalized + 360 : normalized;
    }

    function getInput(api, field) {
        return api.els.geometryPanel.querySelector('[data-geometry="' + field + '"]');
    }

    function getCenter(item) {
        return {
            x: Math.round(item.x) + Math.floor(Math.round(item.width) / 2),
            y: Math.round(item.y) + Math.floor(Math.round(item.height) / 2)
        };
    }

    function sync(api) {
        const item = api.getSelectedItem();
        if (!item || !api.els.geometryPanel) return;

        syncing = true;
        const center = getCenter(item);
        const values = {
            "center-x": center.x,
            "center-y": center.y,
            rotation: Math.round(normalizeRotation(item.rotation || 0)),
            width: Math.round(item.width),
            height: Math.round(item.height)
        };

        fieldNames.forEach(function (field) {
            const input = getInput(api, field);
            if (input && editingField !== field) input.value = values[field];
        });
        if (!editingField) {
            aspectRatio = Math.max(api.minSize, values.width) / Math.max(api.minSize, values.height);
        }
        syncing = false;
    }

    function read(api, item) {
        const center = getCenter(item);
        const centerXInput = getInput(api, "center-x");
        const centerYInput = getInput(api, "center-y");
        const rotationInput = getInput(api, "rotation");
        const widthInput = getInput(api, "width");
        const heightInput = getInput(api, "height");
        const width = Math.max(api.minSize, toInteger(widthInput ? widthInput.value : item.width, item.width));
        const height = Math.max(api.minSize, toInteger(heightInput ? heightInput.value : item.height, item.height));

        return {
            centerX: toInteger(centerXInput ? centerXInput.value : center.x, center.x),
            centerY: toInteger(centerYInput ? centerYInput.value : center.y, center.y),
            rotation: normalizeRotation(toInteger(rotationInput ? rotationInput.value : item.rotation || 0, item.rotation || 0)),
            width: width,
            height: height
        };
    }

    function apply(api) {
        const item = api.getSelectedItem();
        if (!item) return;

        api.markCanvasActive();
        const values = read(api, item);

        item.width = values.width;
        item.height = values.height;
        item.x = values.centerX - Math.floor(values.width / 2);
        item.y = values.centerY - Math.floor(values.height / 2);
        item.rotation = values.rotation;

        editingField = null;
        api.keepItemInReach(item);
        api.renderItem(item);
        api.updateSelection();
        api.commitHistory();
        api.showToast("已更新位置/大小");
    }

    function sanitizeInputValue(input) {
        const sanitized = input.value.replace(/[^\d-]/g, "");
        if (input.value !== sanitized) {
            input.value = sanitized;
        }
    }

    function isAspectLocked(api) {
        const lock = api.els.geometryPanel.querySelector("[data-geometry-lock]");
        return Boolean(lock && lock.checked);
    }

    function applyAspectLock(api, changedField) {
        if (syncing || !isAspectLocked(api)) return;
        if (changedField !== "width" && changedField !== "height") return;

        const widthInput = getInput(api, "width");
        const heightInput = getInput(api, "height");
        if (!widthInput || !heightInput) return;

        if (changedField === "width") {
            const width = Math.max(api.minSize, toInteger(widthInput.value, api.minSize));
            heightInput.value = Math.max(api.minSize, Math.round(width / Math.max(0.0001, aspectRatio)));
        } else {
            const height = Math.max(api.minSize, toInteger(heightInput.value, api.minSize));
            widthInput.value = Math.max(api.minSize, Math.round(height * Math.max(0.0001, aspectRatio)));
        }
    }

    function init(api) {
        api.showGeometryPanel = function () {
            if (!api.getSelectedItem() || !api.els.geometryPanel) return;
            api.hideColorPanel();
            api.els.geometryPanel.hidden = false;
            editingField = null;
            sync(api);
            api.updateGeometryPanelPosition();
        };

        api.hideGeometryPanel = function () {
            if (api.els.geometryPanel) api.els.geometryPanel.hidden = true;
        };

        if (!api.els.geometryPanel) return;

        api.els.geometryPanel.addEventListener("click", function (event) {
            const action = event.target.dataset.action;
            if (action === "apply-geometry") {
                apply(api);
            }
        });

        if (api.els.geometryPanelClose) {
            function closeGeometryPanel(event) {
                event.preventDefault();
                event.stopPropagation();
                api.hideGeometryPanel();
            }

            api.els.geometryPanelClose.addEventListener("pointerdown", closeGeometryPanel);
            api.els.geometryPanelClose.addEventListener("click", closeGeometryPanel);
        }

        api.els.geometryPanel.querySelectorAll("input").forEach(function (input) {
            input.inputMode = "numeric";
            input.pattern = "-?[0-9]*";

            input.addEventListener("keydown", function (event) {
                if (blockedKeys.has(event.key)) {
                    event.preventDefault();
                    return;
                }
                if (event.key === "Enter") {
                    event.preventDefault();
                    apply(api);
                    input.blur();
                }
            });

            input.addEventListener("input", function () {
                sanitizeInputValue(input);
                applyAspectLock(api, input.dataset.geometry);
            });

            input.addEventListener("focus", function () {
                editingField = input.dataset.geometry || null;
            });

            input.addEventListener("blur", function () {
                const item = api.getSelectedItem();
                editingField = null;
                if (!item) return;
                const values = read(api, item);
                const map = {
                    "center-x": values.centerX,
                    "center-y": values.centerY,
                    rotation: values.rotation,
                    width: values.width,
                    height: values.height
                };
                fieldNames.forEach(function (field) {
                    const fieldInput = getInput(api, field);
                    if (fieldInput) fieldInput.value = map[field];
                });
            });
        });

        const lock = api.els.geometryPanel.querySelector("[data-geometry-lock]");
        if (lock) {
            lock.addEventListener("change", function () {
                const item = api.getSelectedItem();
                if (!item) return;
                const values = read(api, item);
                aspectRatio = Math.max(api.minSize, values.width) / Math.max(api.minSize, values.height);
            });
        }
    }

    window.ImageGeometryPanel = {
        init: init,
        sync: sync
    };
})();
