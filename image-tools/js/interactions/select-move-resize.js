(function () {
    const cornerHandles = new Set(["nw", "ne", "se", "sw"]);

    function getPointerPoint(event) {
        return {
            x: event.clientX,
            y: event.clientY
        };
    }

    function calculateSideResize(handle, start, dx, dy, minSize) {
        const next = {
            x: start.x,
            y: start.y,
            width: start.width,
            height: start.height
        };

        if (handle.indexOf("e") !== -1) {
            next.width = Math.max(minSize, start.width + dx);
        }
        if (handle.indexOf("s") !== -1) {
            next.height = Math.max(minSize, start.height + dy);
        }
        if (handle.indexOf("w") !== -1) {
            next.width = Math.max(minSize, start.width - dx);
            next.x = start.x + start.width - next.width;
        }
        if (handle.indexOf("n") !== -1) {
            next.height = Math.max(minSize, start.height - dy);
            next.y = start.y + start.height - next.height;
        }

        return next;
    }

    function calculateCornerResize(handle, start, dx, dy, minSize) {
        const aspect = start.width / Math.max(1, start.height);
        const xSign = handle.indexOf("w") !== -1 ? -1 : 1;
        const ySign = handle.indexOf("n") !== -1 ? -1 : 1;
        const widthCandidate = Math.max(minSize, start.width + dx * xSign);
        const heightCandidate = Math.max(minSize, start.height + dy * ySign);
        const widthRatio = Math.abs(widthCandidate - start.width) / Math.max(1, start.width);
        const heightRatio = Math.abs(heightCandidate - start.height) / Math.max(1, start.height);

        let width;
        let height;
        if (heightRatio > widthRatio) {
            height = heightCandidate;
            width = Math.max(minSize, height * aspect);
        } else {
            width = widthCandidate;
            height = Math.max(minSize, width / aspect);
        }

        const next = {
            width: Math.round(width),
            height: Math.round(height),
            x: start.x,
            y: start.y
        };

        if (handle.indexOf("w") !== -1) {
            next.x = start.x + start.width - next.width;
        }
        if (handle.indexOf("n") !== -1) {
            next.y = start.y + start.height - next.height;
        }

        return next;
    }

    function init(api) {
        let activeMove = null;
        let activeResize = null;

        api.els.layer.addEventListener("pointerdown", function (event) {
            const node = event.target.closest(".image-node");
            if (!node) return;

            const item = api.getItem(node.dataset.imageId);
            if (!item) return;

            api.markCanvasActive();
            api.selectItem(item.id);

            if (event.button !== 0) return;
            event.preventDefault();
            node.setPointerCapture(event.pointerId);

            const point = getPointerPoint(event);
            activeMove = {
                pointerId: event.pointerId,
                item: item,
                startX: point.x,
                startY: point.y,
                itemX: item.x,
                itemY: item.y,
                moved: false
            };
            api.els.stage.classList.add("image-dragging");
        });

        api.els.layer.addEventListener("pointermove", function (event) {
            if (!activeMove || activeMove.pointerId !== event.pointerId) return;

            const dx = event.clientX - activeMove.startX;
            const dy = event.clientY - activeMove.startY;
            if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
                activeMove.moved = true;
            }
            activeMove.item.x = activeMove.itemX + dx;
            activeMove.item.y = activeMove.itemY + dy;
            api.keepItemInReach(activeMove.item);
            api.renderItem(activeMove.item);
            api.updateSelection();
            api.updateColorPanelPosition();
        });

        api.els.layer.addEventListener("pointerup", function (event) {
            if (!activeMove || activeMove.pointerId !== event.pointerId) return;
            if (activeMove.moved) {
                api.commitHistory();
            }
            activeMove = null;
            api.els.stage.classList.remove("image-dragging");
        });

        api.els.layer.addEventListener("pointercancel", function () {
            activeMove = null;
            api.els.stage.classList.remove("image-dragging");
        });

        api.els.selection.addEventListener("pointerdown", function (event) {
            const handle = event.target.dataset.handle;
            const item = api.getSelectedItem();
            if (!handle || !item || event.button !== 0) return;

            api.markCanvasActive();
            event.preventDefault();
            api.els.selection.setPointerCapture(event.pointerId);
            activeResize = {
                pointerId: event.pointerId,
                handle: handle,
                startX: event.clientX,
                startY: event.clientY,
                item: item,
                itemStart: {
                    x: item.x,
                    y: item.y,
                    width: item.width,
                    height: item.height
                },
                moved: false
            };
        });

        api.els.selection.addEventListener("pointermove", function (event) {
            if (!activeResize || activeResize.pointerId !== event.pointerId) return;

            const dx = event.clientX - activeResize.startX;
            const dy = event.clientY - activeResize.startY;
            if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
                activeResize.moved = true;
            }
            const next = cornerHandles.has(activeResize.handle)
                ? calculateCornerResize(activeResize.handle, activeResize.itemStart, dx, dy, api.minSize)
                : calculateSideResize(activeResize.handle, activeResize.itemStart, dx, dy, api.minSize);

            activeResize.item.x = next.x;
            activeResize.item.y = next.y;
            activeResize.item.width = next.width;
            activeResize.item.height = next.height;
            api.keepItemInReach(activeResize.item);
            api.renderItem(activeResize.item);
            api.updateSelection();
            api.updateColorPanelPosition();
        });

        api.els.selection.addEventListener("pointerup", function (event) {
            if (!activeResize || activeResize.pointerId !== event.pointerId) return;
            if (activeResize.moved) {
                api.commitHistory();
            }
            activeResize = null;
        });

        api.els.selection.addEventListener("pointercancel", function () {
            activeResize = null;
        });

        api.els.stage.addEventListener("pointerdown", function (event) {
            const isChrome = event.target.closest(".image-node, .image-selection, .image-color-panel, .image-context-menu, .image-topbar, .theme-toggle");
            if (isChrome) return;
            if (event.button === 0) {
                api.markCanvasActive();
                api.selectItem(null);
                api.hideContextMenu();
                api.hideColorPanel();
            }
        });
    }

    window.ImageSelectMoveResize = {
        init: init
    };
})();
