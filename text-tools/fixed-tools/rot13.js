(function () {
    const { rot13 } = window.FixedToolUtils;

    function mountRot13(container, helpers, options = {}) {
        const headerActions = options.headerActions || null;
        if (headerActions) {
            headerActions.innerHTML = `<button class="head-help" type="button" data-tip="ROT13 会把英文字母固定轮转 13 位；它是可逆的，同一段文本执行两次会回到原文。">❓</button>`;
        }

        container.innerHTML = `<div class="stack">
            <textarea class="text-input" data-role="source" placeholder="输入任意文本"></textarea>
            <div class="controls-row">
                <button class="action-btn" data-action="convert">执行 ROT13</button>
                <button class="action-btn warn" data-action="clear">清空</button>
            </div>
            <textarea class="text-output" data-role="output" readonly placeholder="转换结果会显示在这里，例如：HELLO -> URYYB"></textarea>
        </div>`;

        const input = container.querySelector('[data-role="source"]');
        const output = container.querySelector('[data-role="output"]');

        container.querySelector('[data-action="convert"]').addEventListener("click", () => {
            if (!input.value.trim()) {
                helpers.showToast("请先输入内容");
                helpers.shake(input);
                return;
            }
            output.value = rot13(input.value);
        });

        container.querySelector('[data-action="clear"]').addEventListener("click", () => {
            input.value = "";
            output.value = "";
            input.focus();
        });

        return () => {
            if (headerActions) headerActions.innerHTML = "";
        };
    }

    window.FixedToolRegistry.register({
        id: "rot13",
        name: "ROT13",
        icon: "🔄",
        desc: "固定轮转 13 位。",
        tags: ["rot13", "轮转", "lunzhuan", "lz", "lzm", "xuanhuan"],
        mount: mountRot13
    });
})();
