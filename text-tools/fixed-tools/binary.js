(function () {
    const BASE_OPTIONS = {
        2: {
            label: "二进制 ASCII",
            bytes: 8,
            tokenPattern: /^[01]{8}$/,
            allowedKeys: "01"
        },
        16: {
            label: "十六进制 ASCII",
            bytes: 2,
            tokenPattern: /^[0-9A-Fa-f]{2}$/,
            allowedKeys: "0123456789ABCDEF"
        }
    };

    const KEY_ORDER = [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "A",
        "B",
        "C",
        "D",
        "E",
        "F"
    ];

    function getBase(container) {
        return Number.parseInt(container.querySelector('[data-role="base-select"]').value, 10);
    }

    function encodeTextToBase(text, base) {
        const cfg = BASE_OPTIONS[base];
        return Array.from(text)
            .map((char) => char.charCodeAt(0).toString(base).toUpperCase().padStart(cfg.bytes, "0"))
            .join(" ");
    }

    function decodeBaseToText(value, base) {
        const cfg = BASE_OPTIONS[base];
        return value
            .trim()
            .split(/\s+/)
            .map((token) => {
                if (cfg.tokenPattern.test(token)) {
                    return String.fromCharCode(parseInt(token, base));
                }
                return token;
            })
            .join("");
    }

    function updateModeUI(container, mode) {
        const inputPanel = container.querySelector('[data-role="panel-input"]');
        const keypadPanel = container.querySelector('[data-role="panel-keypad"]');
        const modeInputBtn = container.querySelector('[data-role="mode-input"]');
        const modeKeypadBtn = container.querySelector('[data-role="mode-keypad"]');

        const isInput = mode === "input";
        inputPanel.style.display = isInput ? "" : "none";
        keypadPanel.style.display = isInput ? "none" : "";
        modeInputBtn.classList.toggle("active", isInput);
        modeKeypadBtn.classList.toggle("active", !isInput);
    }

    function updateBaseDependentUI(container) {
        const base = getBase(container);
        const cfg = BASE_OPTIONS[base];
        const source = container.querySelector('[data-role="source"]');
        const encodeBtn = container.querySelector('[data-role="encode"]');
        const decodeBtn = container.querySelector('[data-role="decode"]');
        const keypadHint = container.querySelector('[data-role="keypad-hint"]');

        source.placeholder = base === 2 ? "输入文本或二进制字节（8位分组）" : "输入文本或十六进制字节（2位分组）";
        encodeBtn.textContent = `文本 -> ${cfg.label}`;
        decodeBtn.textContent = `${cfg.label} -> 文本`;
        keypadHint.textContent = `按键模式：当前为${cfg.label}，每组${cfg.bytes}位，使用空格分隔。`;

        container.querySelectorAll(".radix-key").forEach((btn) => {
            const key = btn.dataset.key;
            btn.disabled = !cfg.allowedKeys.includes(key);
        });
    }

    function mountRadixConverter(container, helpers) {
        container.innerHTML = `<div class="panel-note">在同一卡片内支持二进制和十六进制转换，可通过下拉切换进制；支持“输入模式”和“按键模式”。</div>
            <div class="stack">
                <div class="controls-row">
                    <label class="input-label" style="margin:0;align-self:center;">当前进制</label>
                    <select class="text-input" data-role="base-select" style="min-height:44px;max-width:220px;">
                        <option value="2">二进制 ASCII</option>
                        <option value="16">十六进制 ASCII</option>
                    </select>
                </div>
                <div class="controls-row">
                    <button class="action-btn active" data-role="mode-input">输入模式</button>
                    <button class="action-btn" data-role="mode-keypad">按键模式</button>
                </div>

                <div data-role="panel-input">
                    <div>
                        <label class="input-label">输入内容</label>
                        <textarea class="text-input" data-role="source" placeholder="输入文本或二进制字节（8位分组）"></textarea>
                    </div>
                    <div class="controls-row">
                        <button class="action-btn" data-role="encode">文本 -> 二进制 ASCII</button>
                        <button class="action-btn" data-role="decode">二进制 ASCII -> 文本</button>
                        <button class="action-btn warn" data-role="clear-input">清空</button>
                    </div>
                    <div>
                        <label class="input-label">输出结果</label>
                        <textarea class="text-output" data-role="output" readonly placeholder="转换结果会显示在这里"></textarea>
                    </div>
                </div>

                <div data-role="panel-keypad" style="display:none;">
                    <div class="panel-note" data-role="keypad-hint">按键模式：当前为二进制 ASCII，每组8位，使用空格分隔。</div>
                    <div>
                        <label class="input-label">屏幕输入</label>
                        <textarea class="text-input" data-role="keypad-screen" placeholder="可直接输入或使用下方虚拟按键" style="min-height:96px;"></textarea>
                    </div>
                    <div class="tool-grid" style="grid-template-columns:repeat(4,minmax(0,1fr));">
                        ${KEY_ORDER.map((key) => `<button class="tool-picker radix-key" type="button" data-key="${key}">${key}</button>`).join("")}
                        <button class="tool-picker" type="button" data-action="space">空格</button>
                        <button class="tool-picker" type="button" data-action="backspace">退格</button>
                        <button class="tool-picker" type="button" data-action="clear-keypad">清空</button>
                        <button class="tool-picker" type="button" data-action="decode-keypad">得到输出</button>
                    </div>
                    <div>
                        <label class="input-label">按键模式输出</label>
                        <textarea class="text-output" data-role="keypad-output" readonly placeholder="按键解码结果会显示在这里"></textarea>
                    </div>
                </div>
            </div>`;

        const baseSelect = container.querySelector('[data-role="base-select"]');
        const source = container.querySelector('[data-role="source"]');
        const output = container.querySelector('[data-role="output"]');
        const keypadScreen = container.querySelector('[data-role="keypad-screen"]');
        const keypadOutput = container.querySelector('[data-role="keypad-output"]');
        const modeInputBtn = container.querySelector('[data-role="mode-input"]');
        const modeKeypadBtn = container.querySelector('[data-role="mode-keypad"]');
        const encodeBtn = container.querySelector('[data-role="encode"]');
        const decodeBtn = container.querySelector('[data-role="decode"]');
        const clearInputBtn = container.querySelector('[data-role="clear-input"]');

        const runInputMode = (action) => {
            const base = getBase(container);
            if (!source.value.trim()) {
                helpers.showToast("请先输入内容");
                helpers.shake(source);
                return;
            }
            output.value = action === "encode" ? encodeTextToBase(source.value, base) : decodeBaseToText(source.value, base);
        };

        const runKeypadDecode = () => {
            const base = getBase(container);
            if (!keypadScreen.value.trim()) {
                helpers.showToast("请先输入按键内容");
                helpers.shake(keypadScreen);
                return;
            }
            keypadOutput.value = decodeBaseToText(keypadScreen.value, base);
        };

        baseSelect.addEventListener("change", () => updateBaseDependentUI(container));
        modeInputBtn.addEventListener("click", () => updateModeUI(container, "input"));
        modeKeypadBtn.addEventListener("click", () => updateModeUI(container, "keypad"));
        encodeBtn.addEventListener("click", () => runInputMode("encode"));
        decodeBtn.addEventListener("click", () => runInputMode("decode"));

        clearInputBtn.addEventListener("click", () => {
            source.value = "";
            output.value = "";
            source.focus();
        });

        container.querySelectorAll(".radix-key").forEach((btn) => {
            btn.addEventListener("click", () => {
                keypadScreen.value += btn.dataset.key;
                keypadScreen.focus();
            });
        });

        container.querySelector('[data-action="space"]').addEventListener("click", () => {
            keypadScreen.value += " ";
            keypadScreen.focus();
        });

        container.querySelector('[data-action="backspace"]').addEventListener("click", () => {
            keypadScreen.value = keypadScreen.value.slice(0, -1);
            keypadScreen.focus();
        });

        container.querySelector('[data-action="clear-keypad"]').addEventListener("click", () => {
            keypadScreen.value = "";
            keypadOutput.value = "";
            keypadScreen.focus();
        });

        container.querySelector('[data-action="decode-keypad"]').addEventListener("click", runKeypadDecode);

        updateModeUI(container, "input");
        updateBaseDependentUI(container);
        return () => {};
    }

    window.FixedToolRegistry.register({
        id: "radix-converter",
        name: "进制转换",
        icon: "🧮",
        desc: "二进制/十六进制统一转换，支持输入与按键模式。",
        tags: [
            "binary",
            "hex",
            "ascii",
            "2进制",
            "16进制",
            "erjinzhi",
            "shiliujinzhi",
            "radix",
            "jinzhi",
            "jzzh"
        ],
        mount: mountRadixConverter
    });
})();
