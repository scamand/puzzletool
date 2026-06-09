(function () {
    const MIN_SIZE = 36;
    const EDGE_MARGIN = 28;
    const DEFAULT_MAX_SIZE = 460;

    const state = {
        items: [],
        selectedId: null,
        selectedIds: [],
        movementMode: "free",
        gridSize: 32,
        rotationStep: 15,
        nextId: 1,
        nextZ: 20
    };

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function fitImageSize(naturalWidth, naturalHeight) {
        const width = Math.max(1, naturalWidth || DEFAULT_MAX_SIZE);
        const height = Math.max(1, naturalHeight || DEFAULT_MAX_SIZE);
        const scale = Math.min(1, DEFAULT_MAX_SIZE / width, DEFAULT_MAX_SIZE / height);
        return {
            width: Math.max(MIN_SIZE, Math.round(width * scale)),
            height: Math.max(MIN_SIZE, Math.round(height * scale))
        };
    }

    function createItem(options) {
        const size = fitImageSize(options.naturalWidth, options.naturalHeight);
        const item = {
            id: "image-" + state.nextId++,
            src: options.src,
            originalSrc: options.src,
            binarySrc: null,
            binaryEnabled: false,
            binaryThreshold: 128,
            naturalWidth: options.naturalWidth || size.width,
            naturalHeight: options.naturalHeight || size.height,
            x: Math.round(options.x || 0),
            y: Math.round(options.y || 0),
            width: size.width,
            height: size.height,
            rotation: 0,
            originX: 50,
            originY: 50,
            opacity: 100,
            saturation: 100,
            brightness: 100,
            z: state.nextZ++,
            node: null,
            img: null
        };
        state.items.push(item);
        return item;
    }

    function getItem(id) {
        return state.items.find(function (item) {
            return item.id === id;
        }) || null;
    }

    function getSelectedItem() {
        return state.selectedId ? getItem(state.selectedId) : null;
    }

    function getSelectedItems() {
        return state.selectedIds
            .map(getItem)
            .filter(Boolean);
    }

    function normalizeSelection(ids) {
        const seen = new Set();
        return ids.filter(function (id) {
            if (!id || seen.has(id) || !getItem(id)) return false;
            seen.add(id);
            return true;
        });
    }

    function selectItems(ids, options) {
        const opts = options || {};
        state.selectedIds = normalizeSelection(Array.isArray(ids) ? ids : []);
        state.selectedId = state.selectedIds.length ? state.selectedIds[state.selectedIds.length - 1] : null;
        if (!opts.preserveZ && state.selectedIds.length) {
            getSelectedItems().forEach(function (item) {
                item.z = state.nextZ++;
            });
        }
        return getSelectedItem();
    }

    function selectItem(id, options) {
        return selectItems(id ? [id] : [], options);
    }

    function toggleSelectedItem(id) {
        if (!id || !getItem(id)) return getSelectedItem();
        const next = state.selectedIds.includes(id)
            ? state.selectedIds.filter(function (selectedId) { return selectedId !== id; })
            : state.selectedIds.concat(id);
        return selectItems(next);
    }

    function keepInReach(item, viewportWidth, viewportHeight) {
        item.x = clamp(item.x, EDGE_MARGIN - item.width, viewportWidth - EDGE_MARGIN);
        item.y = clamp(item.y, EDGE_MARGIN - item.height, viewportHeight - EDGE_MARGIN);
    }

    window.ImageToolState = {
        MIN_SIZE: MIN_SIZE,
        EDGE_MARGIN: EDGE_MARGIN,
        state: state,
        clamp: clamp,
        createItem: createItem,
        getItem: getItem,
        getSelectedItem: getSelectedItem,
        getSelectedItems: getSelectedItems,
        selectItem: selectItem,
        selectItems: selectItems,
        toggleSelectedItem: toggleSelectedItem,
        keepInReach: keepInReach
    };
})();
