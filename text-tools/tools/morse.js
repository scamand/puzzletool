(function () {
    const { MORSE_MAP, MORSE_REVERSE } = window.FixedToolUtils;
    const ZH_PREFIX = "ZH";

    function isCjkChar(char) {
        return /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(char);
    }

    function encodeMorse(value) {
        const tokens = [];
        for (const char of value) {
            if (char === " ") {
                tokens.push("/");
                continue;
            }

            const direct = MORSE_MAP[char.toUpperCase()];
            if (direct) {
                tokens.push(direct);
                continue;
            }

            if (isCjkChar(char)) {
                const code = char.codePointAt(0).toString(16).toUpperCase().padStart(6, "0");
                const marker = `${ZH_PREFIX}${code}`;
                for (const markerChar of marker) {
                    tokens.push(MORSE_MAP[markerChar] || markerChar);
                }
                continue;
            }

            tokens.push(char);
        }
        return tokens.join(" ");
    }

    function decodeMorse(value) {
        const plain = value
            .trim()
            .split(/\s+/)
            .map((token) => {
                if (token === "/") return " ";
                return MORSE_REVERSE[token] || token;
            })
            .join("");

        return plain.replace(/ZH([0-9A-F]{6})/g, (_, hex) => {
            const codePoint = Number.parseInt(hex, 16);
            return Number.isInteger(codePoint) ? String.fromCodePoint(codePoint) : `${ZH_PREFIX}${hex}`;
        });
    }

    function mountMorse(container, helpers, options = {}) {
        let mode = "text";
        let sequence = "";
        let outputValue = "";
        let cleanupKeyboard = null;
        const headerActions = options.headerActions || null;

        if (headerActions) {
            headerActions.innerHTML = `<button class="head-toggle" type="button" data-role="morse-mode">按键模式</button>
                <button class="head-help" type="button" data-tip="文本模式支持文本与摩斯互转；按键模式可点击 . - / 或使用键盘输入，Enter 写入输出，Del 清空输出。">❓</button>`;
            headerActions.querySelector('[data-role="morse-mode"]').addEventListener("click", () => {
                mode = mode === "text" ? "key" : "text";
                render();
            });
        }

        function render() {
            if (cleanupKeyboard) {
                cleanupKeyboard();
                cleanupKeyboard = null;
            }

            const toggle = headerActions && headerActions.querySelector('[data-role="morse-mode"]');
            if (toggle) toggle.textContent = mode === "text" ? "按键模式" : "文本模式";

            if (mode === "key") renderKeyMode();
            else renderTextMode();
        }

        function renderTextMode() {
            container.innerHTML = `<div class="stack">
                <textarea class="text-input" data-role="source" placeholder="输入要编码或解码的文本（支持中文）"></textarea>
                <div class="controls-row">
                    <button class="action-btn" data-action="encode">文本 -> 摩斯</button>
                    <button class="action-btn" data-action="decode">摩斯 -> 文本</button>
                    <button class="action-btn warn" data-action="clear">清空</button>
                </div>
                <textarea class="text-output" data-role="output" readonly placeholder="转换结果会显示在这里"></textarea>
            </div>`;

            const input = container.querySelector('[data-role="source"]');
            const output = container.querySelector('[data-role="output"]');
            output.value = outputValue;
            const run = (fn) => {
                if (!input.value.trim()) {
                    helpers.showToast("请先输入内容");
                    helpers.shake(input);
                    return;
                }
                outputValue = fn(input.value);
                output.value = outputValue;
            };

            container.querySelector('[data-action="encode"]').addEventListener("click", () => run(encodeMorse));
            container.querySelector('[data-action="decode"]').addEventListener("click", () => run(decodeMorse));
            container.querySelector('[data-action="clear"]').addEventListener("click", () => {
                input.value = "";
                outputValue = "";
                output.value = outputValue;
                input.focus();
            });
        }

        function renderKeyMode() {
            sequence = "";
            container.innerHTML = `<div class="stack">
                <div class="morse-keypad">
                    <div class="morse-keys">
                        <button class="morse-key" type="button" data-key=".">.</button>
                        <button class="morse-key" type="button" data-key="-">-</button>
                        <button class="morse-key" type="button" data-key="/">/</button>
                        <button class="morse-key backspace" type="button" data-action="backspace">退格</button>
                    </div>
                    <div class="morse-live">
                        <div class="morse-live-part"><span class="morse-sequence morse-muted" data-role="sequence">等待输入</span></div>
                        <div class="morse-live-part"><span class="morse-letter morse-muted" data-role="letter">-</span></div>
                    </div>
                </div>
                <textarea class="text-output" data-role="output" readonly placeholder="按 Enter 将当前字符写入这里"></textarea>
            </div>`;

            const output = container.querySelector('[data-role="output"]');
            const sequenceEl = container.querySelector('[data-role="sequence"]');
            const letterEl = container.querySelector('[data-role="letter"]');
            output.value = outputValue;

            const updatePreview = () => {
                const hasInput = sequence.length > 0;
                sequenceEl.textContent = hasInput ? sequence : "等待输入";
                sequenceEl.classList.toggle("morse-muted", !hasInput);
                letterEl.textContent = hasInput ? previewSequence(sequence) : "-";
                letterEl.classList.toggle("morse-muted", !hasInput);
            };

            const flash = (key) => {
                const button = Array.from(container.querySelectorAll(".morse-key")).find((item) => item.dataset.key === key);
                if (!button) return;
                button.classList.remove("flash");
                void button.offsetWidth;
                button.classList.add("flash");
            };

            const press = (key) => {
                sequence += key;
                flash(key);
                updatePreview();
            };

            const backspace = () => {
                if (!sequence) return;
                sequence = sequence.slice(0, -1);
                const button = container.querySelector('[data-action="backspace"]');
                if (button) {
                    button.classList.remove("flash");
                    void button.offsetWidth;
                    button.classList.add("flash");
                }
                updatePreview();
            };

            const commit = () => {
                if (!sequence) return;
                outputValue += resolveSequence(sequence);
                output.value = outputValue;
                sequence = "";
                updatePreview();
            };

            container.querySelectorAll(".morse-key").forEach((button) => {
                if (button.dataset.action === "backspace") return;
                button.addEventListener("click", () => press(button.dataset.key));
            });
            container.querySelector('[data-action="backspace"]').addEventListener("click", backspace);

            const clearOutput = () => {
                outputValue = "";
                output.value = outputValue;
                sequence = "";
                updatePreview();
            };

            const onKeyDown = (event) => {
                const card = container.closest(".tool-card");
                const isActiveCard = card && (card.matches(":hover") || card.contains(document.activeElement));
                if (!isActiveCard) return;

                if (event.key === "." || event.key === "-" || event.key === "/") {
                    event.preventDefault();
                    press(event.key);
                } else if (event.key === "Backspace") {
                    event.preventDefault();
                    backspace();
                } else if (event.key === "Enter") {
                    event.preventDefault();
                    commit();
                } else if (event.key === "Delete") {
                    event.preventDefault();
                    clearOutput();
                }
            };

            document.addEventListener("keydown", onKeyDown);
            cleanupKeyboard = () => document.removeEventListener("keydown", onKeyDown);
            updatePreview();
        }

        function previewSequence(value) {
            if (value === "/") return "空格";
            return MORSE_REVERSE[value] || "?";
        }

        function resolveSequence(value) {
            if (value === "/") return " ";
            return MORSE_REVERSE[value] || "?";
        }

        render();
        return () => {
            if (cleanupKeyboard) cleanupKeyboard();
            if (headerActions) headerActions.innerHTML = "";
        };
    }

    window.FixedToolRegistry.register({
        id: "morse",
        name: "摩斯密码",
        icon: "📡",
        desc: "点划编码互转。",
        tags: ["morse", "点划", "编码", "mosi", "mosimima", "ms", "msm", ".-", "--", "dida", "嘀嗒", "dianda"],
        mount: mountMorse
    });
})();
