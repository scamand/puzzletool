(function () {
    const cornerHandles = new Set(["nw", "ne", "se", "sw"]);

    function getPointerPoint(event) {
        return {
            x: event.clientX,
            y: event.clientY
        };
    }

    function toLocalDelta(dx, dy, rotation) {
        const angle = -(rotation || 0) * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: dx * cos - dy * sin,
            y: dx * sin + dy * cos
        };
    }

    function getRotationCenter(item) {
        return {
            x: item.x + item.width * (Number.isFinite(item.originX) ? item.originX : 50) / 100,
            y: item.y + item.height * (Number.isFinite(item.originY) ? item.originY : 50) / 100
        };
    }

    function getOriginLocal(box) {
        return {
            x: box.width * (Number.isFinite(box.originX) ? box.originX : 50) / 100,
            y: box.height * (Number.isFinite(box.originY) ? box.originY : 50) / 100
        };
    }

    function getAnchorLocal(handle, box) {
        const origin = getOriginLocal(box);

        if (handle.indexOf("e") !== -1 && handle.indexOf("n") === -1 && handle.indexOf("s") === -1) {
            return { x: 0, y: origin.y };
        }
        if (handle.indexOf("w") !== -1 && handle.indexOf("n") === -1 && handle.indexOf("s") === -1) {
            return { x: box.width, y: origin.y };
        }
        if (handle.indexOf("s") !== -1 && handle.indexOf("e") === -1 && handle.indexOf("w") === -1) {
            return { x: origin.x, y: 0 };
        }
        if (handle.indexOf("n") !== -1 && handle.indexOf("e") === -1 && handle.indexOf("w") === -1) {
            return { x: origin.x, y: box.height };
        }

        return {
            x: handle.indexOf("w") !== -1 ? box.width : 0,
            y: handle.indexOf("n") !== -1 ? box.height : 0
        };
    }

    function localPointToWorld(box, point) {
        const origin = getOriginLocal(box);
        const angle = (box.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = point.x - origin.x;
        const dy = point.y - origin.y;

        return {
            x: box.x + origin.x + dx * cos - dy * sin,
            y: box.y + origin.y + dx * sin + dy * cos
        };
    }

    function positionBoxFromWorldAnchor(box, handle, anchorWorld) {
        const origin = getOriginLocal(box);
        const anchor = getAnchorLocal(handle, box);
        const angle = (box.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = anchor.x - origin.x;
        const dy = anchor.y - origin.y;

        return {
            x: anchorWorld.x - origin.x - (dx * cos - dy * sin),
            y: anchorWorld.y - origin.y - (dx * sin + dy * cos)
        };
    }

    function normalizeRotation(value) {
        const normalized = value % 360;
        return normalized < 0 ? normalized + 360 : normalized;
    }

    function rotatePoint(point, center, degrees) {
        const angle = degrees * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        return {
            x: center.x + dx * cos - dy * sin,
            y: center.y + dx * sin + dy * cos
        };
    }

    function getGroupCenter(items, api) {
        const bounds = api.getItemsBounds(items);
        return {
            x: (bounds.left + bounds.right) / 2,
            y: (bounds.top + bounds.bottom) / 2
        };
    }

    function getBoxRect(startX, startY, currentX, currentY) {
        return {
            left: Math.min(startX, currentX),
            top: Math.min(startY, currentY),
            right: Math.max(startX, currentX),
            bottom: Math.max(startY, currentY)
        };
    }

    function paintMarquee(api, rect) {
        api.els.marquee.hidden = false;
        api.els.marquee.style.left = rect.left + "px";
        api.els.marquee.style.top = rect.top + "px";
        api.els.marquee.style.width = Math.max(1, rect.right - rect.left) + "px";
        api.els.marquee.style.height = Math.max(1, rect.bottom - rect.top) + "px";
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
        let activeRotate = null;
        let activeMarquee = null;

        api.els.layer.addEventListener("pointerdown", function (event) {
            const node = event.target.closest(".image-node");
            if (!node) return;

            const item = api.getItem(node.dataset.imageId);
            if (!item) return;

            api.markCanvasActive();
            if (event.ctrlKey || event.metaKey || event.shiftKey) {
                event.preventDefault();
                api.toggleSelectedItem(item.id);
                api.hideContextMenu();
                api.hideCanvasMenu();
                return;
            }

            const wasSelected = api.getSelectedItems().some(function (selected) {
                return selected.id === item.id;
            });
            if (!wasSelected) {
                api.selectItem(item.id);
            }

            if (event.button !== 0) return;
            event.preventDefault();
            node.setPointerCapture(event.pointerId);

            const point = getPointerPoint(event);
            const movingItems = api.getSelectedItems();
            activeMove = {
                pointerId: event.pointerId,
                items: movingItems,
                startX: point.x,
                startY: point.y,
                itemStarts: movingItems.map(function (movingItem) {
                    return {
                        item: movingItem,
                        x: movingItem.x,
                        y: movingItem.y
                    };
                }),
                startBounds: api.getItemsBounds(movingItems),
                moved: false
            };
            api.els.stage.classList.add("image-dragging");
        });

        api.els.layer.addEventListener("pointermove", function (event) {
            if (!activeMove || activeMove.pointerId !== event.pointerId) return;

            const dx = event.clientX - activeMove.startX;
            const dy = event.clientY - activeMove.startY;
            const snapped = api.snapMoveForSelection(activeMove.itemStarts, dx, dy, activeMove.startBounds);
            if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
                activeMove.moved = true;
            }
            activeMove.itemStarts.forEach(function (entry) {
                entry.item.x = entry.x + snapped.x;
                entry.item.y = entry.y + snapped.y;
                api.keepItemInReach(entry.item);
                api.renderItem(entry.item);
            });
            api.updateSelection();
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
            const selectedItems = api.getSelectedItems();
            const item = api.getSelectedItem();
            if (!handle || !item || !selectedItems.length || event.button !== 0) return;

            api.markCanvasActive();
            event.preventDefault();
            api.els.selection.setPointerCapture(event.pointerId);

            if (handle === "rotate") {
                const isGroup = selectedItems.length > 1;
                const center = isGroup ? getGroupCenter(selectedItems, api) : getRotationCenter(item);
                activeRotate = {
                    pointerId: event.pointerId,
                    items: selectedItems,
                    center: center,
                    startAngle: Math.atan2(event.clientY - center.y, event.clientX - center.x) * 180 / Math.PI,
                    startRotation: item.rotation || 0,
                    itemStarts: selectedItems.map(function (rotateItem) {
                        const itemCenter = getRotationCenter(rotateItem);
                        return {
                            item: rotateItem,
                            x: rotateItem.x,
                            y: rotateItem.y,
                            rotation: rotateItem.rotation || 0,
                            center: itemCenter
                        };
                    }),
                    isGroup: isGroup,
                    moved: false
                };
                return;
            }

            if (selectedItems.length > 1) return;

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
                    height: item.height,
                    rotation: item.rotation || 0,
                    originX: Number.isFinite(item.originX) ? item.originX : 50,
                    originY: Number.isFinite(item.originY) ? item.originY : 50
                },
                moved: false
            };
            activeResize.anchorWorld = localPointToWorld(
                activeResize.itemStart,
                getAnchorLocal(handle, activeResize.itemStart)
            );
        });

        api.els.selection.addEventListener("pointermove", function (event) {
            if (activeRotate && activeRotate.pointerId === event.pointerId) {
                const nextAngle = Math.atan2(event.clientY - activeRotate.center.y, event.clientX - activeRotate.center.x) * 180 / Math.PI;
                const rawDelta = nextAngle - activeRotate.startAngle;
                const primaryRotation = api.snapAbsoluteRotation(activeRotate.startRotation + rawDelta);
                const delta = primaryRotation - activeRotate.startRotation;
                if (Math.abs(delta) > 0) {
                    activeRotate.moved = true;
                }
                activeRotate.itemStarts.forEach(function (entry) {
                    if (activeRotate.isGroup) {
                        const rotatedCenter = rotatePoint(entry.center, activeRotate.center, delta);
                        const originX = Number.isFinite(entry.item.originX) ? entry.item.originX : 50;
                        const originY = Number.isFinite(entry.item.originY) ? entry.item.originY : 50;
                        entry.item.x = rotatedCenter.x - entry.item.width * originX / 100;
                        entry.item.y = rotatedCenter.y - entry.item.height * originY / 100;
                        entry.item.rotation = normalizeRotation(entry.rotation + delta);
                    } else {
                        entry.item.rotation = normalizeRotation(entry.rotation + delta);
                    }
                    api.renderItem(entry.item);
                });
                api.updateSelection();
                return;
            }

            if (!activeResize || activeResize.pointerId !== event.pointerId) return;

            const pointerDx = event.clientX - activeResize.startX;
            const pointerDy = event.clientY - activeResize.startY;
            const localDelta = toLocalDelta(pointerDx, pointerDy, activeResize.itemStart.rotation || 0);
            const dx = localDelta.x;
            const dy = localDelta.y;
            if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
                activeResize.moved = true;
            }
            const next = cornerHandles.has(activeResize.handle)
                ? calculateCornerResize(activeResize.handle, activeResize.itemStart, dx, dy, api.minSize)
                : calculateSideResize(activeResize.handle, activeResize.itemStart, dx, dy, api.minSize);
            const snappedNext = api.snapResizeBox(
                activeResize.itemStart,
                next,
                activeResize.handle,
                cornerHandles.has(activeResize.handle)
            );
            const anchoredPosition = positionBoxFromWorldAnchor(
                {
                    x: snappedNext.x,
                    y: snappedNext.y,
                    width: snappedNext.width,
                    height: snappedNext.height,
                    rotation: activeResize.itemStart.rotation,
                    originX: activeResize.itemStart.originX,
                    originY: activeResize.itemStart.originY
                },
                activeResize.handle,
                activeResize.anchorWorld
            );

            activeResize.item.x = Math.round(anchoredPosition.x);
            activeResize.item.y = Math.round(anchoredPosition.y);
            activeResize.item.width = snappedNext.width;
            activeResize.item.height = snappedNext.height;
            api.keepItemInReach(activeResize.item);
            api.renderItem(activeResize.item);
            api.updateSelection();
        });

        api.els.selection.addEventListener("pointerup", function (event) {
            if (activeRotate && activeRotate.pointerId === event.pointerId) {
                if (activeRotate.moved) {
                    api.commitHistory();
                }
                activeRotate = null;
                return;
            }
            if (!activeResize || activeResize.pointerId !== event.pointerId) return;
            if (activeResize.moved) {
                api.commitHistory();
            }
            activeResize = null;
        });

        api.els.selection.addEventListener("pointercancel", function () {
            activeResize = null;
            activeRotate = null;
        });

        api.els.stage.addEventListener("pointerdown", function (event) {
            const isChrome = event.target.closest(".image-node, .image-selection, .image-color-panel, .image-geometry-panel, .image-context-menu, .image-canvas-menu, .image-topbar, .theme-toggle");
            if (isChrome) return;
            if (event.button === 0) {
                api.markCanvasActive();
                api.hideContextMenu();
                api.hideCanvasMenu();
                api.hideColorPanel();
                api.hideGeometryPanel();
                api.els.stage.setPointerCapture(event.pointerId);
                activeMarquee = {
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY,
                    additive: event.ctrlKey || event.metaKey || event.shiftKey,
                    baseIds: api.getSelectedItems().map(function (item) { return item.id; }),
                    moved: false
                };
            }
        });

        api.els.stage.addEventListener("pointermove", function (event) {
            if (!activeMarquee || activeMarquee.pointerId !== event.pointerId) return;
            const rect = getBoxRect(activeMarquee.startX, activeMarquee.startY, event.clientX, event.clientY);
            if (rect.right - rect.left > 3 || rect.bottom - rect.top > 3) {
                activeMarquee.moved = true;
            }
            paintMarquee(api, rect);
        });

        api.els.stage.addEventListener("pointerup", function (event) {
            if (!activeMarquee || activeMarquee.pointerId !== event.pointerId) return;
            const rect = getBoxRect(activeMarquee.startX, activeMarquee.startY, event.clientX, event.clientY);
            api.els.marquee.hidden = true;

            if (!activeMarquee.moved) {
                if (!activeMarquee.additive) api.selectItem(null);
                activeMarquee = null;
                return;
            }

            const foundIds = [];
            api.getAllItems().forEach(function (item) {
                if (api.rectsIntersect(rect, api.getItemVisualBounds(item))) {
                    foundIds.push(item.id);
                }
            });

            if (activeMarquee.additive) {
                const selected = new Set(activeMarquee.baseIds);
                foundIds.forEach(function (id) {
                    if (event.shiftKey && selected.has(id)) selected.delete(id);
                    else selected.add(id);
                });
                api.selectItems(Array.from(selected));
            } else {
                api.selectItems(foundIds);
            }
            activeMarquee = null;
        });

        api.els.stage.addEventListener("pointercancel", function () {
            activeMarquee = null;
            api.els.marquee.hidden = true;
        });
    }

    window.ImageSelectMoveResize = {
        init: init
    };
})();
