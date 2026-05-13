(function () {
    function toBinaryByte(value) {
        return value.toString(2).padStart(8, "0");
    }

    function encodeLatinBytes(value) {
        const bytes = [];
        for (const char of value) {
            const code = char.codePointAt(0);
            if (code > 255) return null;
            bytes.push(code);
        }
        return bytes;
    }

    function encodeUtf8Bytes(value) {
        return Array.from(new TextEncoder().encode(value));
    }

    function parseBinaryBytes(value) {
        const tokens = value.trim().split(/[\s,;，；]+/).filter(Boolean);
        if (!tokens.length) return [];

        const bytes = [];
        for (const token of tokens) {
            if (!/^[01]{1,8}$/.test(token)) return null;
            bytes.push(Number.parseInt(token, 2));
        }
        return bytes;
    }

    function decodeLatinBytes(bytes) {
        return String.fromCharCode(...bytes);
    }

    function decodeUtf8Bytes(bytes) {
        try {
            return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
        } catch (_) {
            return null;
        }
    }

    function mountBinaryText(container, helpers, options = {}) {
        const headerActions = options.headerActions || null;
        if (headerActions) {
            headerActions.innerHTML = `<button class="head-help" type="button" data-tip="文本转二进制会按字节输出 8 位分组。默认适合英文/ASCII；勾选中文后使用 UTF-8，可处理中文。二进制输入用空格、逗号或分号分隔。">❓</button>`;
        }

        container.innerHTML = `<div class="stack">
            <textarea class="text-input" data-role="source" placeholder="输入文本或二进制，例如：ABCDEFG 或 01000001 01000010"></textarea>
            <div class="controls-row">
                <label class="inline-check">
                    <input type="checkbox" data-role="chinese">
                    <span>中文</span>
                </label>
                <select class="text-input compact-input binary-encoding" data-role="encoding" disabled>
                    <option value="utf-8">UTF-8</option>
                </select>
                <button class="action-btn" data-action="encode">文本 -> 二进制</button>
                <button class="action-btn" data-action="decode">二进制 -> 文本</button>
                <button class="action-btn warn" data-action="clear">清空</button>
            </div>
            <textarea class="text-output" data-role="output" readonly placeholder="转换结果会显示在这里，例如：ABCDEFG -> 01000001 01000010 01000011 01000100 01000101 01000110 01000111"></textarea>
        </div>`;

        const input = container.querySelector('[data-role="source"]');
        const output = container.querySelector('[data-role="output"]');
        const chinese = container.querySelector('[data-role="chinese"]');
        const encoding = container.querySelector('[data-role="encoding"]');

        function useUtf8() {
            return chinese.checked && encoding.value === "utf-8";
        }

        function syncEncoding() {
            encoding.disabled = !chinese.checked;
        }

        function requireInput() {
            if (input.value.trim()) return true;
            helpers.showToast("请先输入内容");
            helpers.shake(input);
            return false;
        }

        function encode() {
            if (!requireInput()) return;
            const bytes = useUtf8() ? encodeUtf8Bytes(input.value) : encodeLatinBytes(input.value);
            if (!bytes) {
                helpers.showToast("包含非单字节字符，请勾选中文使用 UTF-8");
                helpers.shake(chinese);
                return;
            }
            output.value = bytes.map(toBinaryByte).join(" ");
        }

        function decode() {
            if (!requireInput()) return;
            const bytes = parseBinaryBytes(input.value);
            if (!bytes) {
                helpers.showToast("二进制格式无效，请使用 1-8 位 0/1 分组");
                helpers.shake(input);
                return;
            }
            const text = useUtf8() ? decodeUtf8Bytes(bytes) : decodeLatinBytes(bytes);
            if (text === null) {
                helpers.showToast("UTF-8 字节序列无效");
                helpers.shake(input);
                return;
            }
            output.value = text;
        }

        chinese.addEventListener("change", syncEncoding);
        container.querySelector('[data-action="encode"]').addEventListener("click", encode);
        container.querySelector('[data-action="decode"]').addEventListener("click", decode);
        container.querySelector('[data-action="clear"]').addEventListener("click", () => {
            input.value = "";
            output.value = "";
            input.focus();
        });
        syncEncoding();

        return () => {
            if (headerActions) headerActions.innerHTML = "";
        };
    }

    window.FixedToolRegistry.register({
        id: "binary-text",
        name: "二进制/文本",
        icon: "💬",
        desc: "文本与 8 位二进制字节互转。",
        tags: ["二进制文本", "binary text", "binary", "text", "ascii", "utf-8", "utf8", "中文", "wenben", "erjinzhi"],
        mount: mountBinaryText
    });
})();
