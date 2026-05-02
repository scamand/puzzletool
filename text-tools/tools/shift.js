(function () {
    function shiftText(text, offset, shiftDigits) {
        let result = "";
        for (const char of text) {
            const code = char.charCodeAt(0);
            if (code >= 65 && code <= 90) {
                result += String.fromCharCode(((code - 65 + offset) % 26 + 26) % 26 + 65);
            } else if (code >= 97 && code <= 122) {
                result += String.fromCharCode(((code - 97 + offset) % 26 + 26) % 26 + 97);
            } else if (shiftDigits && code >= 48 && code <= 57) {
                result += String.fromCharCode(((code - 48 + offset) % 10 + 10) % 10 + 48);
            } else {
                result += char;
            }
        }
        return result;
    }

    function mountShift(container, helpers, options = {}) {
        const headerActions = options.headerActions || null;
        if (headerActions) {
            headerActions.innerHTML = `<button class="head-help" type="button" data-tip="按固定偏移量移动字母，负数表示反向移动。勾选数字后，0-9 也会按同样偏移循环。">❓</button>`;
        }

        container.innerHTML = `<div class="stack">
            <div class="controls-row">
                <label title="偏移量">
                    <input class="rail-input" data-role="offset" type="number" min="-25" max="25" step="1" value="3" aria-label="偏移量">
                </label>
                <label style="display:inline-flex;align-items:center;gap:8px;min-height:44px;color:var(--text-sub);">
                    <input type="checkbox" data-role="shift-digits">
                    同时移位数字
                </label>
            </div>
            <textarea class="text-input" data-role="cipher" placeholder="输入密文"></textarea>
            <div class="controls-row">
                <button class="action-btn" data-action="decrypt">↓ 解密</button>
                <button class="action-btn" data-action="encrypt">↑ 加密</button>
                <button class="action-btn warn" data-action="clear">清空</button>
            </div>
            <textarea class="text-output" data-role="plain" placeholder="输入明文或查看结果，例如：HELLO 偏移 3 -> KHOOR"></textarea>
        </div>`;

        const offsetInput = container.querySelector('[data-role="offset"]');
        const shiftDigits = container.querySelector('[data-role="shift-digits"]');
        const cipher = container.querySelector('[data-role="cipher"]');
        const plain = container.querySelector('[data-role="plain"]');

        const getOffset = () => {
            const value = Number.parseInt(offsetInput.value, 10);
            if (!Number.isInteger(value) || value < -25 || value > 25 || value === 0) {
                helpers.showToast("偏移量必须是 -25 到 25 之间的非零整数");
                helpers.shake(offsetInput);
                return null;
            }
            return value;
        };

        container.querySelector('[data-action="encrypt"]').addEventListener("click", () => {
            const offset = getOffset();
            if (offset === null) return;
            if (!plain.value.trim()) {
                helpers.showToast("请先输入明文");
                helpers.shake(plain);
                return;
            }
            cipher.value = shiftText(plain.value, offset, shiftDigits.checked);
        });

        container.querySelector('[data-action="decrypt"]').addEventListener("click", () => {
            const offset = getOffset();
            if (offset === null) return;
            if (!cipher.value.trim()) {
                helpers.showToast("请先输入密文");
                helpers.shake(cipher);
                return;
            }
            plain.value = shiftText(cipher.value, -offset, shiftDigits.checked);
        });

        container.querySelector('[data-action="clear"]').addEventListener("click", () => {
            cipher.value = "";
            plain.value = "";
            cipher.focus();
        });

        return () => {
            if (headerActions) headerActions.innerHTML = "";
        };
    }

    window.FixedToolRegistry.register({
        id: "shift",
        name: "移位密码",
        icon: "➡️",
        desc: "凯撒移位，支持数字。",
        tags: ["shift", "caesar", "凯撒", "移位", "偏移", "yíwèi", "kaisa", "kaisamima"],
        mount: mountShift
    });
})();
