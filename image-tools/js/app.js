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
            opacity: item.opacity,
            saturation: item.saturation,
            brightness: item.brightness,
            z: item.z
        };
    }

    function createApi(els) {
        let toastTimer = 0;
        let binaryRequestId = 0;
        let historyTimer = 0;

        const api = {
            els: els,
            minSize: store.MIN_SIZE,
            clamp: store.clamp,
            getItem: store.getItem,
            getSelectedItem: store.getSelectedItem,

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
                    const item = store.createItem({
                        src: src,
                        naturalWidth: info.naturalWidth,
                        naturalHeight: info.naturalHeight,
                        x: 0,
                        y: 0
                    });
                    item.x = Math.round((window.innerWidth - item.width) / 2);
                    item.y = Math.round((window.innerHeight - item.height) / 2);
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
                const opts = options || {};
                const selected = opts.preserveZ
                    ? (store.state.selectedId = id || null, store.getSelectedItem())
                    : store.selectItem(id);
                store.state.items.forEach(function (item) {
                    if (!item.node) return;
                    item.node.classList.toggle("selected", item.id === store.state.selectedId);
                    item.node.style.zIndex = item.z;
                });
                api.updateSelection();
                if (!selected) {
                    api.hideColorPanel();
                } else {
                    window.ImageFilterControls.syncAll(api);
                    api.updateColorPanelPosition();
                }
            },

            createSnapshot: function () {
                return {
                    items: store.state.items.map(cloneItemForSnapshot),
                    selectedId: store.state.selectedId,
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
                }
                api.selectItem(store.state.selectedId, { preserveZ: true });
            },

            updateSelection: function () {
                const item = store.getSelectedItem();
                if (!item) {
                    els.selection.hidden = true;
                    return;
                }

                els.selection.hidden = false;
                els.selection.style.left = item.x + "px";
                els.selection.style.top = item.y + "px";
                els.selection.style.width = item.width + "px";
                els.selection.style.height = item.height + "px";
                els.selection.style.zIndex = item.z + 1;
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

            showColorPanel: function () {
                if (!store.getSelectedItem()) return;
                els.colorPanel.hidden = false;
                window.ImageFilterControls.syncAll(api);
                api.updateColorPanelPosition();
            },

            hideColorPanel: function () {
                els.colorPanel.hidden = true;
            },

            updateColorPanelPosition: function () {
                const item = store.getSelectedItem();
                if (!item || els.colorPanel.hidden) return;

                const panel = els.colorPanel;
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
                    const canvas = document.createElement("canvas");
                    canvas.width = Math.max(1, Math.round(item.width));
                    canvas.height = Math.max(1, Math.round(item.height));
                    const context = canvas.getContext("2d");
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    context.globalAlpha = item.opacity / 100;
                    context.filter = "saturate(" + item.saturation + "%) brightness(" + item.brightness + "%)";
                    context.drawImage(image, 0, 0, canvas.width, canvas.height);

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
            selection: document.getElementById("imageSelection"),
            contextMenu: document.getElementById("imageContextMenu"),
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
        window.ImageColorPanel.init(api);
        window.ImageHistory.init(api);

        window.addEventListener("resize", function () {
            const item = api.getSelectedItem();
            if (item) {
                api.keepItemInReach(item);
                api.renderItem(item);
                api.updateSelection();
                api.updateColorPanelPosition();
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
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
