(function () {
    function splitElements(value) {
        const text = value.trim();
        if (!text) return [];
        return /\s/.test(text) ? text.split(/\s+/).filter(Boolean) : text.split("");
    }

    function buildMaps(cipherRaw, plainRaw, ignoreCase) {
        const cipherElements = splitElements(cipherRaw);
        const plainElements = splitElements(plainRaw);
        if (!cipherElements.length || !plainElements.length) return { error: "你输入的密钥不完整" };
        if (cipherElements.length !== plainElements.length) return { error: "左右元素数量不一致，可能没有添加分隔符" };

        const cipherToPlain = Object.create(null);
        const plainToCipher = Object.create(null);
        for (let i = 0; i < cipherElements.length; i += 1) {
            const cipher = cipherElements[i];
            const plain = plainElements[i];
            cipherToPlain[cipher] = plain;
            plainToCipher[plain] = cipher;

            if (ignoreCase) {
                cipherToPlain[cipher.toLowerCase()] = plain.toLowerCase();
                cipherToPlain[cipher.toUpperCase()] = plain.toUpperCase();
                plainToCipher[plain.toLowerCase()] = cipher.toLowerCase();
                plainToCipher[plain.toUpperCase()] = cipher.toUpperCase();
            }
        }
        return { cipherToPlain, plainToCipher };
    }

    function convertText(text, map, preserveUnmatched) {
        const output = [];
        for (const char of text) {
            if (char === " " || char === "\n") {
                output.push(char);
            } else if (map[char] !== undefined) {
                output.push(map[char]);
            } else if (preserveUnmatched) {
                output.push(char);
            } else {
                return { error: `输入中出现了密钥中不存在的元素：${char}` };
            }
        }
        return { result: output.join("") };
    }

    function mountCustomTable(container, helpers, options = {}) {
        const headerActions = options.headerActions || null;
        if (headerActions) {
            headerActions.innerHTML = `<button class="head-help" type="button" data-tip="分别输入密文元素和明文元素，元素可用空格分隔；无空格时按单字符分割。两侧数量必须一致。">❓</button>`;
        }

        container.innerHTML = `<div class="stack">
            <div class="mapping-grid">
                <input class="text-input compact-input" data-role="cipher-key" type="text" placeholder="密文元素，例如：A B C D">
                <input class="text-input compact-input" data-role="plain-key" type="text" placeholder="明文元素，例如：1 2 3 4">
            </div>
            <div class="controls-row">
                <label style="display:inline-flex;align-items:center;gap:8px;min-height:44px;color:var(--text-sub);">
                    <input type="checkbox" data-role="ignore-case" checked>
                    不区分大小写
                </label>
                <label style="display:inline-flex;align-items:center;gap:8px;min-height:44px;color:var(--text-sub);">
                    <input type="checkbox" data-role="preserve-unmatched">
                    保留未匹配元素
                </label>
            </div>
            <textarea class="text-input" data-role="cipher-text" placeholder="请输入密文"></textarea>
            <div class="controls-row">
                <button class="action-btn" data-action="decrypt">↓ 解密</button>
                <button class="action-btn" data-action="encrypt">↑ 加密</button>
                <button class="action-btn warn" data-action="clear">清空</button>
            </div>
            <textarea class="text-output" data-role="plain-text" placeholder="请输入明文或查看结果"></textarea>
        </div>`;

        const cipherKey = container.querySelector('[data-role="cipher-key"]');
        const plainKey = container.querySelector('[data-role="plain-key"]');
        const ignoreCase = container.querySelector('[data-role="ignore-case"]');
        const preserveUnmatched = container.querySelector('[data-role="preserve-unmatched"]');
        const cipherText = container.querySelector('[data-role="cipher-text"]');
        const plainText = container.querySelector('[data-role="plain-text"]');

        const getMaps = () => {
            const maps = buildMaps(cipherKey.value, plainKey.value, ignoreCase.checked);
            if (maps.error) {
                helpers.showToast(maps.error);
                helpers.shake(cipherKey);
                helpers.shake(plainKey);
                return null;
            }
            return maps;
        };

        const run = (isDecrypt) => {
            const maps = getMaps();
            if (!maps) return;
            const source = isDecrypt ? cipherText : plainText;
            const target = isDecrypt ? plainText : cipherText;
            if (!source.value.trim()) {
                helpers.showToast(isDecrypt ? "请先输入密文" : "请先输入明文");
                helpers.shake(source);
                return;
            }

            const result = convertText(
                source.value,
                isDecrypt ? maps.cipherToPlain : maps.plainToCipher,
                preserveUnmatched.checked
            );
            if (result.error) {
                helpers.showToast(result.error);
                helpers.shake(source);
                return;
            }
            target.value = result.result;
        };

        container.querySelector('[data-action="decrypt"]').addEventListener("click", () => run(true));
        container.querySelector('[data-action="encrypt"]').addEventListener("click", () => run(false));
        container.querySelector('[data-action="clear"]').addEventListener("click", () => {
            cipherText.value = "";
            plainText.value = "";
            cipherText.focus();
        });

        return () => {
            if (headerActions) headerActions.innerHTML = "";
        };
    }

    window.FixedToolRegistry.register({
        id: "custom-table",
        name: "自定义密码表",
        icon: "🧾",
        desc: "自定义字符映射互译。",
        tags: ["自定义", "密码表", "映射", "custom", "table", "zidingyi", "mimabiao", "map"],
        mount: mountCustomTable
    });
})();
