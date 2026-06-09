(function () {
    function init(api) {
        api.els.stage.addEventListener("contextmenu", function (event) {
            if (event.target.closest(".image-node, .image-selection, .image-color-panel, .image-context-menu, .image-canvas-menu, .image-topbar, .theme-toggle")) return;

            event.preventDefault();
            api.markCanvasActive();
            api.setPointerPosition(event.clientX, event.clientY);
            api.selectItem(null);
            api.hideContextMenu();
            api.hideColorPanel();
            api.showCanvasMenu(event.clientX, event.clientY);
        });

        api.els.layer.addEventListener("contextmenu", function (event) {
            const node = event.target.closest(".image-node");
            if (!node) return;

            const item = api.getItem(node.dataset.imageId);
            if (!item) return;

            event.preventDefault();
            api.markCanvasActive();
            api.selectItem(item.id);
            api.hideCanvasMenu();
            api.showContextMenu(event.clientX, event.clientY);
        });

        api.els.contextMenu.addEventListener("click", function (event) {
            const action = event.target.dataset.action;
            if (action === "open-color") {
                api.hideContextMenu();
                api.showColorPanel();
            }
        });

        api.els.canvasMenu.addEventListener("change", function (event) {
            const setting = event.target.dataset.setting;
            if (setting === "movement-mode") {
                api.setMovementMode(event.target.value);
            }
        });

        api.els.canvasMenu.addEventListener("click", function (event) {
            const action = event.target.dataset.action;
            if (action === "open-move-mode") {
                api.showMoveModePanel();
            }
        });

        api.els.canvasMenu.addEventListener("keydown", function (event) {
            if (event.key !== "Enter") return;
            const setting = event.target.dataset.setting;
            if (setting === "grid-size") {
                api.setGridSettings({ gridSize: Number(event.target.value) });
                event.target.blur();
            }
            if (setting === "rotation-step") {
                api.setGridSettings({ rotationStep: Number(event.target.value) });
                event.target.blur();
            }
        });

        api.els.canvasMenu.addEventListener("focusout", function (event) {
            const setting = event.target.dataset.setting;
            if (setting === "grid-size") {
                api.setGridSettings({ gridSize: Number(event.target.value) });
            }
            if (setting === "rotation-step") {
                api.setGridSettings({ rotationStep: Number(event.target.value) });
            }
        });

        document.addEventListener("pointerdown", function (event) {
            if (event.target.closest(".image-context-menu")) return;
            if (event.target.closest(".image-canvas-menu")) return;
            if (event.target.closest(".image-node")) return;
            api.hideContextMenu();
            api.hideCanvasMenu();
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                api.hideContextMenu();
                api.hideCanvasMenu();
            }
        });
    }

    window.ImageContextMenu = {
        init: init
    };
})();
