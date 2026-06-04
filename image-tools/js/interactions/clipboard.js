(function () {
    function findImageFile(clipboardData) {
        const items = clipboardData && clipboardData.items ? Array.from(clipboardData.items) : [];
        for (const item of items) {
            if (item.kind === "file" && item.type.indexOf("image/") === 0) {
                return item.getAsFile();
            }
        }
        return null;
    }

    function init(api) {
        document.addEventListener("paste", function (event) {
            const file = findImageFile(event.clipboardData);
            if (!file) {
                api.showToast("剪切板中没有图片");
                return;
            }

            event.preventDefault();
            api.addImageFromFile(file);
        });

        document.addEventListener("keydown", function (event) {
            const target = event.target;
            if (target && target.closest("input, textarea, select, [contenteditable='true']")) return;
            if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "c") return;

            const selected = api.getSelectedItem();
            if (!selected) return;
            event.preventDefault();
            api.copySelectedImage();
        });
    }

    window.ImageClipboard = {
        init: init
    };
})();
