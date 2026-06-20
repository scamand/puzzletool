(function () {
    const store = window.ImageToolState;

    function loadImageInfo(src) {
        return new Promise(function (resolve, reject) {
            const image = new Image();
            image.onload = function () {
                resolve({
                    naturalWidth: image.naturalWidth || image.width,
                    naturalHeight: image.naturalHeight || image.height
                });
            };
            image.onerror = function () {
                reject(new Error("image-load-failed"));
            };
            image.src = src;
        });
    }

    function loadDrawableImage(src) {
        return new Promise(function (resolve, reject) {
            const image = new Image();
            image.onload = function () {
                resolve(image);
            };
            image.onerror = function () {
                reject(new Error("image-load-failed"));
            };
            image.src = src;
        });
    }

    async function calculateVisualOrigin(src) {
        try {
            const image = await loadDrawableImage(src);
            const naturalWidth = Math.max(1, image.naturalWidth || image.width);
            const naturalHeight = Math.max(1, image.naturalHeight || image.height);
            const scale = Math.min(1, 512 / naturalWidth, 512 / naturalHeight);
            const width = Math.max(1, Math.round(naturalWidth * scale));
            const height = Math.max(1, Math.round(naturalHeight * scale));
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d", { willReadFrequently: true });
            context.drawImage(image, 0, 0, width, height);

            const data = context.getImageData(0, 0, width, height).data;
            let total = 0;
            let sumX = 0;
            let sumY = 0;
            for (let y = 0; y < height; y += 1) {
                for (let x = 0; x < width; x += 1) {
                    const alpha = data[(y * width + x) * 4 + 3];
                    if (alpha < 8) continue;
                    total += alpha;
                    sumX += (x + .5) * alpha;
                    sumY += (y + .5) * alpha;
                }
            }

            if (!total) return { originX: 50, originY: 50 };
            return {
                originX: Math.max(0, Math.min(100, sumX / total / width * 100)),
                originY: Math.max(0, Math.min(100, sumY / total / height * 100))
            };
        } catch (_) {
            return { originX: 50, originY: 50 };
        }
    }

    function cloneItemForSnapshot(item) {
        return {
            id: item.id,
            src: item.src,
            originalSrc: item.originalSrc,
            binarySrc: item.binarySrc,
            binaryEnabled: item.binaryEnabled,
            binaryThreshold: item.binaryThreshold,
            naturalWidth: item.naturalWidth,
            naturalHeight: item.naturalHeight,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            rotation: item.rotation || 0,
            originX: Number.isFinite(item.originX) ? item.originX : 50,
            originY: Number.isFinite(item.originY) ? item.originY : 50,
            opacity: item.opacity,
            saturation: item.saturation,
            brightness: item.brightness,
            z: item.z
        };
    }

    function getItemOriginPoint(item) {
        const originX = Number.isFinite(item.originX) ? item.originX : 50;
        const originY = Number.isFinite(item.originY) ? item.originY : 50;
        return {
            x: item.x + item.width * originX / 100,
            y: item.y + item.height * originY / 100
        };
    }

    function getItemVisualBounds(item) {
        const angle = (item.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const origin = getItemOriginPoint(item);
        const corners = [
            [item.x, item.y],
            [item.x + item.width, item.y],
            [item.x + item.width, item.y + item.height],
            [item.x, item.y + item.height]
        ].map(function (point) {
            const dx = point[0] - origin.x;
            const dy = point[1] - origin.y;
            return {
                x: origin.x + dx * cos - dy * sin,
                y: origin.y + dx * sin + dy * cos
            };
        });
        const xs = corners.map(function (point) { return point.x; });
        const ys = corners.map(function (point) { return point.y; });
        return {
            left: Math.min.apply(null, xs),
            top: Math.min.apply(null, ys),
            right: Math.max.apply(null, xs),
            bottom: Math.max.apply(null, ys)
        };
    }

    function getItemsBounds(items) {
        if (!items.length) return null;
        const bounds = items.map(getItemVisualBounds);
        return {
            left: Math.min.apply(null, bounds.map(function (item) { return item.left; })),
            top: Math.min.apply(null, bounds.map(function (item) { return item.top; })),
            right: Math.max.apply(null, bounds.map(function (item) { return item.right; })),
            bottom: Math.max.apply(null, bounds.map(function (item) { return item.bottom; }))
        };
    }

    function rectsIntersect(a, b) {
        return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
    }

    function createApi(els) {
        let toastTimer = 0;
        let binaryRequestId = 0;
        let historyTimer = 0;
        let lastPointer = null;

        const api = {
            els: els,
            minSize: store.MIN_SIZE,
            clamp: store.clamp,
            getItem: store.getItem,
            getAllItems: function () {
                return store.state.items.slice();
            },
            getSelectedItem: store.getSelectedItem,
            getSelectedItems: store.getSelectedItems,
            getItemVisualBounds: getItemVisualBounds,
            getItemsBounds: getItemsBounds,
            rectsIntersect: rectsIntersect,

            showGeometryPanel: function () {},
            hideGeometryPanel: function () {},

            setPointerPosition: function (x, y) {
                lastPointer = { x: x, y: y };
            },

            snapMoveDelta: function (dx, dy) {
                if (store.state.movementMode !== "grid") {
                    return { x: dx, y: dy };
                }
                const size = Math.max(1, Number(store.state.gridSize) || 1);
                return {
                    x: Math.round(dx / size) * size,
                    y: Math.round(dy / size) * size
                };
            },

            isGridMode: function () {
                return store.state.movementMode === "grid";
            },

            snapToGrid: function (value) {
                if (store.state.movementMode !== "grid") return value;
                const size = Math.max(1, Number(store.state.gridSize) || 1);
                return Math.round(value / size) * size;
            },

            snapMoveForSelection: function (itemStarts, dx, dy, startBounds) {
                if (store.state.movementMode !== "grid") {
                    return { x: dx, y: dy };
                }

                if (itemStarts.length <= 1) {
                    const entry = itemStarts[0];
                    return {
                        x: api.snapToGrid(entry.x + dx) - entry.x,
                        y: api.snapToGrid(entry.y + dy) - entry.y
                    };
                }

                return {
                    x: api.snapToGrid(startBounds.left + dx) - startBounds.left,
                    y: api.snapToGrid(startBounds.top + dy) - startBounds.top
                };
            },

            snapResizeBox: function (start, next, handle, keepAspect) {
                if (store.state.movementMode !== "grid") return next;

                const minSize = api.minSize;
                const grid = api.snapToGrid;
                const startRight = start.x + start.width;
                const startBottom = start.y + start.height;
                const aspect = start.width / Math.max(1, start.height);
                const snapped = {
                    x: next.x,
                    y: next.y,
                    width: next.width,
                    height: next.height
                };

                if (!keepAspect) {
                    if (handle.indexOf("e") !== -1) {
                        snapped.width = Math.max(minSize, grid(next.x + next.width) - next.x);
                    }
                    if (handle.indexOf("s") !== -1) {
                        snapped.height = Math.max(minSize, grid(next.y + next.height) - next.y);
                    }
                    if (handle.indexOf("w") !== -1) {
                        const left = Math.min(startRight - minSize, grid(next.x));
                        snapped.x = left;
                        snapped.width = Math.max(minSize, startRight - left);
                    }
                    if (handle.indexOf("n") !== -1) {
                        const top = Math.min(startBottom - minSize, grid(next.y));
                        snapped.y = top;
                        snapped.height = Math.max(minSize, startBottom - top);
                    }
                    return snapped;
                }

                const fixedX = handle.indexOf("w") !== -1 ? startRight : start.x;
                const fixedY = handle.indexOf("n") !== -1 ? startBottom : start.y;
                const draggedX = handle.indexOf("w") !== -1 ? grid(next.x) : grid(next.x + next.width);
                const draggedY = handle.indexOf("n") !== -1 ? grid(next.y) : grid(next.y + next.height);
                const widthCandidate = Math.max(minSize, Math.abs(draggedX - fixedX));
                const heightCandidate = Math.max(minSize, Math.abs(draggedY - fixedY));
                const useHeight = Math.abs(heightCandidate - start.height) / Math.max(1, start.height) >
                    Math.abs(widthCandidate - start.width) / Math.max(1, start.width);
                const width = useHeight ? Math.max(minSize, heightCandidate * aspect) : widthCandidate;
                const height = useHeight ? heightCandidate : Math.max(minSize, width / aspect);

                snapped.width = Math.round(width);
                snapped.height = Math.round(height);
                snapped.x = handle.indexOf("w") !== -1 ? startRight - snapped.width : start.x;
                snapped.y = handle.indexOf("n") !== -1 ? startBottom - snapped.height : start.y;
                return snapped;
            },

            snapRotation: function (angle) {
                if (store.state.movementMode !== "grid") return angle;
                const step = Math.max(1, Number(store.state.rotationStep) || 1);
                return Math.round(angle / step) * step;
            },

            snapAbsoluteRotation: function (angle) {
                if (store.state.movementMode !== "grid") return angle;
                const step = Math.max(1, Number(store.state.rotationStep) || 1);
                return Math.round(angle / step) * step;
            },

            showToast: function (message) {
                window.clearTimeout(toastTimer);
                els.toast.textContent = message;
                els.toast.classList.add("show");
                toastTimer = window.setTimeout(function () {
                    els.toast.classList.remove("show");
                }, 1800);
            },

            markCanvasActive: function () {
                document.body.classList.add("canvas-active");
            },

            commitHistory: function () {
                if (window.ImageHistory) {
                    window.ImageHistory.commit(api);
                }
            },

            scheduleHistoryCommit: function (delay) {
                window.clearTimeout(historyTimer);
                historyTimer = window.setTimeout(function () {
                    api.commitHistory();
                }, delay || 280);
            },

            clearScheduledHistory: function () {
                window.clearTimeout(historyTimer);
            },

            keepItemInReach: function (item) {
                store.keepInReach(item, window.innerWidth, window.innerHeight);
            },

            addImageFromFile: async function (file) {
                api.markCanvasActive();
                const src = URL.createObjectURL(file);
                try {
                    const info = await loadImageInfo(src);
                    const visualOrigin = await calculateVisualOrigin(src);
                    const item = store.createItem({
                        src: src,
                        naturalWidth: info.naturalWidth,
                        naturalHeight: info.naturalHeight,
                        x: 0,
                        y: 0
                    });
                    item.originX = visualOrigin.originX;
                    item.originY = visualOrigin.originY;
                    const pastePoint = lastPointer || {
                        x: window.innerWidth / 2,
                        y: window.innerHeight / 2
                    };
                    item.x = Math.round(api.snapToGrid(pastePoint.x - item.width / 2));
                    item.y = Math.round(api.snapToGrid(pastePoint.y - item.height / 2));
                    api.keepItemInReach(item);
                    api.mountItem(item);
                    api.selectItem(item.id);
                    api.showToast("已粘贴图片");
                    api.commitHistory();
                } catch (_) {
                    URL.revokeObjectURL(src);
                    api.showToast("图片读取失败");
                }
            },

            mountItem: function (item) {
                const node = document.createElement("div");
                const image = document.createElement("img");

                node.className = "image-node";
                node.dataset.imageId = item.id;
                image.alt = "";
                image.draggable = false;

                node.appendChild(image);
                els.layer.appendChild(node);

                item.node = node;
                item.img = image;
                api.applyItemImageSource(item);
                api.renderItem(item);
                api.applyItemVisual(item);
            },

            renderItem: function (item) {
                if (!item.node) return;
                item.node.style.left = item.x + "px";
                item.node.style.top = item.y + "px";
                item.node.style.width = item.width + "px";
                item.node.style.height = item.height + "px";
                item.node.style.zIndex = item.z;
                const originX = Number.isFinite(item.originX) ? item.originX : 50;
                const originY = Number.isFinite(item.originY) ? item.originY : 50;
                item.node.style.transformOrigin = originX + "% " + originY + "%";
                item.node.style.transform = "rotate(" + (item.rotation || 0) + "deg)";
            },

            applyItemImageSource: function (item) {
                if (!item.img) return;
                item.src = item.binaryEnabled && item.binarySrc ? item.binarySrc : item.originalSrc;
                item.img.src = item.src;
            },

            applyItemVisual: function (item) {
                if (!item.img) return;
                item.img.style.opacity = String(item.opacity / 100);
                item.img.style.filter = "saturate(" + item.saturation + "%) brightness(" + item.brightness + "%)";
            },

            selectItem: function (id, options) {
                return api.selectItems(id ? [id] : [], options);
            },

            selectItems: function (ids, options) {
                const opts = options || {};
                const selected = store.selectItems(ids, opts);
                store.state.items.forEach(function (item) {
                    if (!item.node) return;
                    const isSelected = store.state.selectedIds.includes(item.id);
                    item.node.classList.toggle("selected", isSelected);
                    item.node.classList.toggle("multi-selected", isSelected && store.state.selectedIds.length > 1);
                    item.node.style.zIndex = item.z;
                });
                api.updateSelection();
                if (!selected) {
                    api.hideColorPanel();
                    api.hideGeometryPanel();
                } else {
                    window.ImageFilterControls.syncAll(api);
                }
            },

            toggleSelectedItem: function (id) {
                store.toggleSelectedItem(id);
                api.selectItems(store.state.selectedIds, { preserveZ: true });
            },

            createSnapshot: function () {
                return {
                    items: store.state.items.map(cloneItemForSnapshot),
                    selectedId: store.state.selectedId,
                    selectedIds: store.state.selectedIds.slice(),
                    movementMode: store.state.movementMode,
                    gridSize: store.state.gridSize,
                    rotationStep: store.state.rotationStep,
                    nextId: store.state.nextId,
                    nextZ: store.state.nextZ
                };
            },

            restoreSnapshot: function (snapshot) {
                els.layer.innerHTML = "";
                store.state.items.length = 0;
                store.state.nextId = snapshot.nextId || 1;
                store.state.nextZ = snapshot.nextZ || 20;
                store.state.selectedId = snapshot.selectedId || null;
                store.state.selectedIds = Array.isArray(snapshot.selectedIds)
                    ? snapshot.selectedIds.slice()
                    : (snapshot.selectedId ? [snapshot.selectedId] : []);
                store.state.movementMode = snapshot.movementMode === "grid" ? "grid" : "free";
                store.state.gridSize = Number.isFinite(snapshot.gridSize) ? snapshot.gridSize : 32;
                store.state.rotationStep = Number.isFinite(snapshot.rotationStep) ? snapshot.rotationStep : 15;

                snapshot.items.forEach(function (data) {
                    const item = Object.assign({}, data, {
                        node: null,
                        img: null
                    });
                    store.state.items.push(item);
                    api.mountItem(item);
                });

                if (!store.getSelectedItem()) {
                    store.state.selectedId = null;
                    store.state.selectedIds = [];
                }
                api.selectItems(store.state.selectedIds, { preserveZ: true });
                api.syncCanvasMenu();
            },

            removeSelectedItem: function () {
                const selectedItems = store.getSelectedItems();
                if (!selectedItems.length) {
                    api.showToast("请先选中图片");
                    return;
                }

                const selectedIds = new Set(selectedItems.map(function (item) { return item.id; }));
                selectedItems.forEach(function (item) {
                    if (item.node) item.node.remove();
                });
                store.state.items = store.state.items.filter(function (item) {
                    return !selectedIds.has(item.id);
                });
                store.state.selectedId = null;
                store.state.selectedIds = [];
                api.hideContextMenu();
                api.hideColorPanel();
                api.hideGeometryPanel();
                api.updateSelection();
                api.commitHistory();
                api.showToast(selectedItems.length > 1 ? "已删除选中图片" : "已删除图片");
            },

            updateSelection: function () {
                const selectedItems = store.getSelectedItems();
                if (!selectedItems.length) {
                    els.selection.hidden = true;
                    return;
                }

                els.selection.hidden = false;
                els.selection.classList.toggle("group-selection", selectedItems.length > 1);

                if (selectedItems.length > 1) {
                    api.hideGeometryPanel();
                    const bounds = getItemsBounds(selectedItems);
                    els.selection.style.left = Math.round(bounds.left) + "px";
                    els.selection.style.top = Math.round(bounds.top) + "px";
                    els.selection.style.width = Math.round(bounds.right - bounds.left) + "px";
                    els.selection.style.height = Math.round(bounds.bottom - bounds.top) + "px";
                    els.selection.style.zIndex = Math.max.apply(null, selectedItems.map(function (item) { return item.z; })) + 1;
                    els.selection.style.setProperty("--image-origin-x", "50%");
                    els.selection.style.setProperty("--image-origin-y", "50%");
                    els.selection.style.transform = "none";
                    return;
                }

                const item = selectedItems[0];
                els.selection.style.left = item.x + "px";
                els.selection.style.top = item.y + "px";
                els.selection.style.width = item.width + "px";
                els.selection.style.height = item.height + "px";
                els.selection.style.zIndex = item.z + 1;
                const originX = Number.isFinite(item.originX) ? item.originX : 50;
                const originY = Number.isFinite(item.originY) ? item.originY : 50;
                els.selection.style.setProperty("--image-origin-x", originX + "%");
                els.selection.style.setProperty("--image-origin-y", originY + "%");
                els.selection.style.transform = "rotate(" + (item.rotation || 0) + "deg)";
                if (window.ImageGeometryPanel) {
                    window.ImageGeometryPanel.sync(api);
                }
                api.updateFollowPanelsPosition();
            },

            showContextMenu: function (x, y) {
                const menu = els.contextMenu;
                menu.classList.add("show");
                const rect = menu.getBoundingClientRect();
                menu.style.left = store.clamp(x, 8, window.innerWidth - rect.width - 8) + "px";
                menu.style.top = store.clamp(y, 8, window.innerHeight - rect.height - 8) + "px";
            },

            hideContextMenu: function () {
                els.contextMenu.classList.remove("show");
            },

            showCanvasMenu: function (x, y) {
                if (els.moveModePanel) {
                    els.moveModePanel.hidden = true;
                }
                api.syncCanvasMenu();
                els.canvasMenu.classList.add("show");
                const rect = els.canvasMenu.getBoundingClientRect();
                els.canvasMenu.style.left = store.clamp(x, 8, window.innerWidth - rect.width - 8) + "px";
                els.canvasMenu.style.top = store.clamp(y, 8, window.innerHeight - rect.height - 8) + "px";
            },

            hideCanvasMenu: function () {
                els.canvasMenu.classList.remove("show");
                if (els.moveModePanel) {
                    els.moveModePanel.hidden = true;
                }
            },

            showMoveModePanel: function () {
                if (!els.moveModePanel) return;
                els.moveModePanel.hidden = false;
                api.syncCanvasMenu();
                const rect = els.canvasMenu.getBoundingClientRect();
                const left = store.clamp(rect.left, 8, window.innerWidth - rect.width - 8);
                const top = store.clamp(rect.top, 8, window.innerHeight - rect.height - 8);
                els.canvasMenu.style.left = left + "px";
                els.canvasMenu.style.top = top + "px";
            },

            syncCanvasMenu: function () {
                if (!els.canvasMenu) return;
                els.canvasMenu.querySelectorAll('[data-setting="movement-mode"]').forEach(function (input) {
                    input.checked = input.value === store.state.movementMode;
                });
                const gridInput = els.canvasMenu.querySelector('[data-setting="grid-size"]');
                const rotationInput = els.canvasMenu.querySelector('[data-setting="rotation-step"]');
                if (gridInput) gridInput.value = store.state.gridSize;
                if (rotationInput) rotationInput.value = store.state.rotationStep;
                if (els.gridSettings) {
                    els.gridSettings.classList.toggle("show", store.state.movementMode === "grid");
                }
            },

            setMovementMode: function (mode) {
                store.state.movementMode = mode === "grid" ? "grid" : "free";
                api.syncCanvasMenu();
                api.commitHistory();
                api.showToast(store.state.movementMode === "grid" ? "已切换到网格模式" : "已切换到自由模式");
            },

            setGridSettings: function (settings) {
                if (Number.isFinite(settings.gridSize)) {
                    store.state.gridSize = Math.round(store.clamp(settings.gridSize, 2, 400));
                }
                if (Number.isFinite(settings.rotationStep)) {
                    store.state.rotationStep = Math.round(store.clamp(settings.rotationStep, 1, 180));
                }
                api.syncCanvasMenu();
                api.commitHistory();
            },

            showColorPanel: function () {
                if (!store.getSelectedItem()) return;
                api.hideGeometryPanel();
                els.colorPanel.hidden = false;
                window.ImageFilterControls.syncAll(api);
                api.updateColorPanelPosition();
            },

            hideColorPanel: function () {
                els.colorPanel.hidden = true;
            },

            updateFollowPanelPosition: function (panel) {
                const item = store.getSelectedItem();
                if (!item || !panel || panel.hidden) return;

                const panelWidth = panel.offsetWidth || 320;
                const panelHeight = panel.offsetHeight || 360;
                let left = item.x + item.width + 14;
                let top = item.y;

                if (left + panelWidth > window.innerWidth - 10) {
                    left = item.x - panelWidth - 14;
                }
                if (left < 10) left = 10;

                top = store.clamp(top, 10, Math.max(10, window.innerHeight - panelHeight - 10));

                panel.style.left = Math.round(left) + "px";
                panel.style.top = Math.round(top) + "px";
            },

            updateColorPanelPosition: function () {
                api.updateFollowPanelPosition(els.colorPanel);
            },

            updateGeometryPanelPosition: function () {
                api.updateFollowPanelPosition(els.geometryPanel);
            },

            updateFollowPanelsPosition: function () {
                api.updateColorPanelPosition();
                api.updateGeometryPanelPosition();
            },

            copySelectedImage: async function () {
                const item = store.getSelectedItem();
                if (!item) {
                    api.showToast("请先选中图片");
                    return;
                }
                if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
                    api.showToast("当前浏览器不支持复制图片");
                    return;
                }

                try {
                    const image = await loadDrawableImage(item.src);
                    const angle = (item.rotation || 0) * Math.PI / 180;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    const width = Math.max(1, Math.round(item.width));
                    const height = Math.max(1, Math.round(item.height));
                    const originX = width * (Number.isFinite(item.originX) ? item.originX : 50) / 100;
                    const originY = height * (Number.isFinite(item.originY) ? item.originY : 50) / 100;
                    const corners = [
                        [0, 0],
                        [width, 0],
                        [width, height],
                        [0, height]
                    ].map(function (point) {
                        const dx = point[0] - originX;
                        const dy = point[1] - originY;
                        return {
                            x: originX + dx * cos - dy * sin,
                            y: originY + dx * sin + dy * cos
                        };
                    });
                    const minX = Math.min.apply(null, corners.map(function (point) { return point.x; }));
                    const minY = Math.min.apply(null, corners.map(function (point) { return point.y; }));
                    const maxX = Math.max.apply(null, corners.map(function (point) { return point.x; }));
                    const maxY = Math.max.apply(null, corners.map(function (point) { return point.y; }));
                    const canvas = document.createElement("canvas");
                    canvas.width = Math.max(1, Math.ceil(maxX - minX));
                    canvas.height = Math.max(1, Math.ceil(maxY - minY));
                    const context = canvas.getContext("2d");
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    context.translate(-minX, -minY);
                    context.translate(originX, originY);
                    context.rotate(angle);
                    context.globalAlpha = item.opacity / 100;
                    context.filter = "saturate(" + item.saturation + "%) brightness(" + item.brightness + "%)";
                    context.drawImage(image, -originX, -originY, width, height);

                    const blob = await new Promise(function (resolve) {
                        canvas.toBlob(resolve, "image/png");
                    });
                    if (!blob) throw new Error("copy-blob-failed");

                    await navigator.clipboard.write([
                        new ClipboardItem({ "image/png": blob })
                    ]);
                    api.showToast("已复制图片");
                } catch (_) {
                    api.showToast("复制失败，浏览器可能限制了剪切板权限");
                }
            },

            generateBinaryImage: async function (item, options) {
                const opts = options || {};
                const requestId = ++binaryRequestId;
                try {
                    const dataUrl = await window.ImageBinary.createBinaryDataUrl(item.originalSrc, item.binaryThreshold);
                    if (requestId !== binaryRequestId) return;
                    item.binarySrc = dataUrl;
                    item.binaryEnabled = true;
                    api.applyItemImageSource(item);
                    api.applyItemVisual(item);
                    if (opts.history === "schedule") {
                        api.scheduleHistoryCommit();
                    } else if (opts.history !== "none") {
                        api.commitHistory();
                    }
                } catch (_) {
                    api.showToast("二值图像生成失败");
                }
            }
        };

        return api;
    }

    function collectElements() {
        return {
            stage: document.getElementById("imageStage"),
            layer: document.getElementById("imageLayer"),
            marquee: document.getElementById("imageMarquee"),
            selection: document.getElementById("imageSelection"),
            contextMenu: document.getElementById("imageContextMenu"),
            canvasMenu: document.getElementById("imageCanvasMenu"),
            moveModePanel: document.getElementById("imageMoveModePanel"),
            gridSettings: document.getElementById("imageGridSettings"),
            geometryPanel: document.getElementById("imageGeometryPanel"),
            geometryPanelClose: document.getElementById("imageGeometryPanelClose"),
            colorPanel: document.getElementById("imageColorPanel"),
            colorPanelClose: document.getElementById("imageColorPanelClose"),
            helpBtn: document.getElementById("imageHelpBtn"),
            helpModal: document.getElementById("imageHelpModal"),
            helpClose: document.getElementById("imageHelpClose"),
            toast: document.getElementById("toast")
        };
    }

    function init() {
        initThemeManager({
            allowToggle: true,
            toggleSelector: "#themeToggle"
        });

        const api = createApi(collectElements());
        window.ImageToolApp = api;

        api.els.helpBtn.addEventListener("click", function () {
            api.els.helpModal.classList.add("show");
        });
        api.els.helpClose.addEventListener("click", function () {
            api.els.helpModal.classList.remove("show");
        });
        api.els.helpModal.addEventListener("click", function (event) {
            if (event.target === api.els.helpModal) {
                api.els.helpModal.classList.remove("show");
            }
        });

        window.ImageClipboard.init(api);
        window.ImageSelectMoveResize.init(api);
        window.ImageContextMenu.init(api);
        window.ImageGeometryPanel.init(api);
        window.ImageColorPanel.init(api);
        window.ImageHistory.init(api);
        api.syncCanvasMenu();

        api.els.stage.addEventListener("pointermove", function (event) {
            api.setPointerPosition(event.clientX, event.clientY);
        });
        api.els.stage.addEventListener("pointerdown", function (event) {
            api.setPointerPosition(event.clientX, event.clientY);
        });

        window.addEventListener("resize", function () {
            const selectedItems = api.getSelectedItems();
            if (selectedItems.length) {
                selectedItems.forEach(function (item) {
                    api.keepItemInReach(item);
                    api.renderItem(item);
                });
                api.updateSelection();
                api.updateFollowPanelsPosition();
            }
        });

        document.addEventListener("dragstart", function (event) {
            if (event.target.closest(".image-node")) {
                event.preventDefault();
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                api.els.helpModal.classList.remove("show");
            }
            const target = event.target;
            const isEditing = target && target.closest && target.closest("input, textarea, select, [contenteditable='true']");
            if ((event.key === "Delete" || event.key === "Del") && !isEditing) {
                event.preventDefault();
                api.markCanvasActive();
                api.removeSelectedItem();
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
