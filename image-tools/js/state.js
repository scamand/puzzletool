(function () {
    const MIN_SIZE = 36;
    const EDGE_MARGIN = 28;
    const DEFAULT_MAX_SIZE = 460;

    const state = {
        items: [],
        selectedId: null,
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

    function selectItem(id) {
        state.selectedId = id || null;
        const item = getSelectedItem();
        if (item) {
            item.z = state.nextZ++;
        }
        return item;
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
        selectItem: selectItem,
        keepInReach: keepInReach
    };
})();
