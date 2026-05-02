(function () {
    const { BACON } = window.FixedToolUtils;

    function encodeBacon(value) {
        return value
            .toUpperCase()
            .split("")
            .map((char) => {
                if (/[A-Z]/.test(char)) return BACON.map[char];
                return char === " " ? "/" : char;
            })
            .join(" ");
    }

    function decodeBacon(value) {
        return value
            .trim()
            .split(/\s+/)
            .map((token) => {
                if (token === "/") return " ";
                if (/^[AB]{5}$/i.test(token)) return BACON.reverse[token.toUpperCase()] || "?";
                return token;
            })
            .join("");
    }

    function mountBacon(container, helpers, options = {}) {
        const headerActions = options.headerActions || null;
        if (headerActions) {
            headerActions.innerHTML = `<button class="head-help" type="button" data-tip="培根密码把字母转成 A/B 组成的五位编码。解码时每组用空格分隔，用 / 表示空格。">❓</button>`;
        }

        container.innerHTML = `<div class="stack">
            <textarea class="text-input" data-role="source" placeholder="输入字母文本或 A/B 编码"></textarea>
            <div class="controls-row">
                <button class="action-btn" data-action="encode">文本 -> 培根</button>
                <button class="action-btn" data-action="decode">培根 -> 文本</button>
                <button class="action-btn warn" data-action="clear">清空</button>
            </div>
            <textarea class="text-output" data-role="output" readonly placeholder="转换结果会显示在这里，例如：HELLO -> AABBB AABAA ABABB ABABB ABBBA"></textarea>
        </div>`;

        const input = container.querySelector('[data-role="source"]');
        const output = container.querySelector('[data-role="output"]');

        const run = (fn) => {
            if (!input.value.trim()) {
                helpers.showToast("请先输入内容");
                helpers.shake(input);
                return;
            }
            output.value = fn(input.value);
        };

        container.querySelector('[data-action="encode"]').addEventListener("click", () => run(encodeBacon));
        container.querySelector('[data-action="decode"]').addEventListener("click", () => run(decodeBacon));
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
        id: "bacon",
        name: "培根密码",
        icon: "BA",
        desc: "A/B 五位组编码。",
        tags: ["bacon", "AB", "五位", "peigen", "peigenmi", "peigenma", "pgm"],
        mount: mountBacon
    });
})();
