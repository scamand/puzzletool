(function () {
    function init(api) {
        api.els.layer.addEventListener("contextmenu", function (event) {
            const node = event.target.closest(".image-node");
            if (!node) return;

            const item = api.getItem(node.dataset.imageId);
            if (!item) return;

            event.preventDefault();
            api.markCanvasActive();
            api.selectItem(item.id);
            api.showContextMenu(event.clientX, event.clientY);
        });

        api.els.contextMenu.addEventListener("click", function (event) {
            const action = event.target.dataset.action;
            if (action === "open-color") {
                api.hideContextMenu();
                api.showColorPanel();
            }
        });

        document.addEventListener("pointerdown", function (event) {
            if (event.target.closest(".image-context-menu")) return;
            if (event.target.closest(".image-node")) return;
            api.hideContextMenu();
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                api.hideContextMenu();
            }
        });
    }

    window.ImageContextMenu = {
        init: init
    };
})();
