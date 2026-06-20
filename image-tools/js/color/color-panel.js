(function () {
    function bindRange(api, field, controlName) {
        const input = api.els.colorPanel.querySelector('[data-control="' + controlName + '"]');
        if (!input) return;

        input.addEventListener("input", function () {
            const liveBinary = field === "binaryThreshold";
            window.ImageFilterControls.applyField(api, field, input.value, {
                liveBinary: liveBinary,
                history: "schedule"
            });
        });
    }

    function bindNumber(api, field, controlName) {
        const input = api.els.colorPanel.querySelector('[data-control="' + controlName + '"]');
        if (!input) return;

        input.inputMode = "numeric";
        input.pattern = "-?[0-9]*";

        function sanitize() {
            const sanitized = input.value.replace(/[^\d-]/g, "");
            if (input.value !== sanitized) {
                input.value = sanitized;
            }
        }

        function apply() {
            const liveBinary = field === "binaryThreshold";
            window.ImageFilterControls.applyField(api, field, input.value, {
                liveBinary: liveBinary,
                history: "commit"
            });
        }

        input.addEventListener("keydown", function (event) {
            if (event.key === "." || event.key === "," || event.key === "e" || event.key === "E" || event.key === "+") {
                event.preventDefault();
                return;
            }
            if (event.key === "Enter") {
                event.preventDefault();
                apply();
                input.blur();
            }
        });

        input.addEventListener("input", sanitize);
        input.addEventListener("blur", apply);
    }

    function init(api) {
        bindRange(api, "opacity", "opacity-range");
        bindRange(api, "saturation", "saturation-range");
        bindRange(api, "brightness", "brightness-range");
        bindRange(api, "binaryThreshold", "threshold-range");

        bindNumber(api, "opacity", "opacity-number");
        bindNumber(api, "saturation", "saturation-number");
        bindNumber(api, "brightness", "brightness-number");
        bindNumber(api, "binaryThreshold", "threshold-number");

        api.els.colorPanel.addEventListener("click", function (event) {
            const action = event.target.dataset.action;
            const item = api.getSelectedItem();
            if (!item) return;

            if (action === "generate-binary") {
                api.generateBinaryImage(item);
            }

            if (action === "restore-original") {
                item.binaryEnabled = false;
                item.binarySrc = null;
                item.src = item.originalSrc;
                api.applyItemImageSource(item);
                api.showToast("已恢复原图");
                api.commitHistory();
            }
        });

        api.els.colorPanelClose.addEventListener("click", function () {
            api.hideColorPanel();
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                api.hideColorPanel();
            }
        });
    }

    window.ImageColorPanel = {
        init: init
    };
})();
