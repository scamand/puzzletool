(function () {
    const MAX_HISTORY = 60;

    const historyState = {
        entries: [],
        index: -1,
        applying: false
    };

    function stringify(snapshot) {
        return JSON.stringify(snapshot);
    }

    function currentSnapshotText() {
        if (historyState.index < 0) return "";
        return stringify(historyState.entries[historyState.index]);
    }

    function commit(api) {
        if (historyState.applying) return;

        const snapshot = api.createSnapshot();
        const text = stringify(snapshot);
        if (text === currentSnapshotText()) return;

        historyState.entries.splice(historyState.index + 1);
        historyState.entries.push(snapshot);
        if (historyState.entries.length > MAX_HISTORY) {
            historyState.entries.shift();
        }
        historyState.index = historyState.entries.length - 1;
    }

    function apply(api, snapshot) {
        historyState.applying = true;
        try {
            api.restoreSnapshot(snapshot);
        } finally {
            historyState.applying = false;
        }
    }

    function undo(api) {
        if (api.clearScheduledHistory) api.clearScheduledHistory();
        if (historyState.index <= 0) {
            api.showToast("没有可撤销的操作");
            return;
        }
        historyState.index -= 1;
        apply(api, historyState.entries[historyState.index]);
    }

    function redo(api) {
        if (api.clearScheduledHistory) api.clearScheduledHistory();
        if (historyState.index >= historyState.entries.length - 1) {
            api.showToast("没有可前进的操作");
            return;
        }
        historyState.index += 1;
        apply(api, historyState.entries[historyState.index]);
    }

    function isEditableTarget(target) {
        return Boolean(target && target.closest("input, textarea, select, [contenteditable='true']"));
    }

    function init(api) {
        commit(api);

        document.addEventListener("keydown", function (event) {
            if (isEditableTarget(event.target)) return;

            const key = event.key.toLowerCase();
            const meta = event.ctrlKey || event.metaKey;
            if (!meta) return;

            if (key === "z" && !event.shiftKey) {
                event.preventDefault();
                undo(api);
            } else if (key === "y" || (key === "z" && event.shiftKey)) {
                event.preventDefault();
                redo(api);
            }
        });
    }

    window.ImageHistory = {
        init: init,
        commit: commit,
        undo: undo,
        redo: redo
    };
})();
