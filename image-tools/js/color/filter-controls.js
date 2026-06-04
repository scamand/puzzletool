(function () {
    const controlMap = {
        opacity: {
            min: 0,
            max: 100,
            number: "opacity-number",
            range: "opacity-range"
        },
        saturation: {
            min: 0,
            max: 200,
            number: "saturation-number",
            range: "saturation-range"
        },
        brightness: {
            min: 0,
            max: 200,
            number: "brightness-number",
            range: "brightness-range"
        },
        binaryThreshold: {
            min: 0,
            max: 255,
            number: "threshold-number",
            range: "threshold-range"
        }
    };

    function clampNumber(api, field, value) {
        const config = controlMap[field];
        const parsed = Number(value);
        const normalized = Number.isFinite(parsed) ? parsed : config.min;
        return Math.round(api.clamp(normalized, config.min, config.max));
    }

    function findControl(panel, name) {
        return panel.querySelector('[data-control="' + name + '"]');
    }

    function syncField(panel, field, value) {
        const config = controlMap[field];
        const number = findControl(panel, config.number);
        const range = findControl(panel, config.range);
        if (number) number.value = value;
        if (range) range.value = value;
    }

    function syncAll(api) {
        const item = api.getSelectedItem();
        if (!item) return;

        syncField(api.els.colorPanel, "opacity", item.opacity);
        syncField(api.els.colorPanel, "saturation", item.saturation);
        syncField(api.els.colorPanel, "brightness", item.brightness);
        syncField(api.els.colorPanel, "binaryThreshold", item.binaryThreshold);
    }

    function applyField(api, field, rawValue, options) {
        const item = api.getSelectedItem();
        if (!item) return;

        api.markCanvasActive();
        const value = clampNumber(api, field, rawValue);
        item[field] = value;
        syncField(api.els.colorPanel, field, value);

        if (field === "binaryThreshold") {
            if (item.binaryEnabled && options && options.liveBinary) {
                api.generateBinaryImage(item, { history: options.history || "schedule" });
            } else if (options && options.history === "commit") {
                api.commitHistory();
            } else if (options && options.history === "schedule") {
                api.scheduleHistoryCommit();
            }
            return;
        }

        api.applyItemVisual(item);
        if (options && options.history === "commit") {
            api.commitHistory();
        } else if (options && options.history === "schedule") {
            api.scheduleHistoryCommit();
        }
    }

    window.ImageFilterControls = {
        controlMap: controlMap,
        syncAll: syncAll,
        applyField: applyField
    };
})();
