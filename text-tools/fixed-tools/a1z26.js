(function () {
    function encodeA1Z26(value) {
        return value
            .trim()
            .split(/\s+/)
            .map((word) =>
                word
                    .split("")
                    .map((char) => {
                        const code = char.toUpperCase().charCodeAt(0);
                        if (code >= 65 && code <= 90) return String(code - 64);
                        return char;
                    })
                    .join(" ")
            )
            .join(" / ");
    }

    function decodeA1Z26(value) {
        return value
            .trim()
            .split(/\s*\/\s*/)
            .map((word) =>
                word
                    .split(/[\s-]+/)
                    .filter(Boolean)
                    .map((token) => {
                        const number = Number(token);
                        if (Number.isInteger(number) && number >= 1 && number <= 26) {
                            return String.fromCharCode(64 + number);
                        }
                        return token;
                    })
                    .join("")
            )
            .join(" ");
    }

    function mountA1Z26(container, helpers, options = {}) {
        const headerActions = options.headerActions || null;
        if (headerActions) {
            headerActions.innerHTML = `<button class="head-help" type="button" data-tip="A1Z26 使用 A=1 到 Z=26 的固定对应关系。数字间用空格或 - 分隔，词之间可用 / 分隔。">❓</button>`;
        }

        container.innerHTML = `<div class="stack">
            <textarea class="text-input" data-role="source" placeholder="输入文本或数字序列，数字请用空格隔开"></textarea>
            <div class="controls-row">
                <button class="action-btn" data-action="encode">文本 -> A1Z26</button>
                <button class="action-btn" data-action="decode">A1Z26 -> 文本</button>
                <button class="action-btn warn" data-action="clear">清空</button>
            </div>
            <textarea class="text-output" data-role="output" readonly placeholder="转换结果会显示在这里，例如：HELLO -> 8 5 12 12 15"></textarea>
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

        container.querySelector('[data-action="encode"]').addEventListener("click", () => run(encodeA1Z26));
        container.querySelector('[data-action="decode"]').addEventListener("click", () => run(decodeA1Z26));
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
        id: "a1z26",
        name: "A1Z26",
        icon: "🔢",
        desc: "字母与 1~26 对应。",
        tags: ["a1z26", "数字", "字母", "shuzi", "zimu", "szm", "zm", "zima", "a=1"],
        mount: mountA1Z26
    });
})();
