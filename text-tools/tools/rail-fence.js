(function () {
    window.FixedToolRegistry.register({
        id: "rail-fence",
        name: "栅栏密码",
        icon: "🧱",
        desc: "分栏重排加解密。",
        tags: ["栅栏", "rail fence", "分栏", "zhalan", "zhalanmima", "zlm", "fenchong", "fenjie"],
        mount: mountRailFence
    });

    function mountRailFence(container, helpers, options = {}) {
        const headerActions = options.headerActions || null;
        if (headerActions) {
            headerActions.innerHTML = `<button class="head-help" type="button" data-tip="栅栏密码支持直栏式分栏和 W 型轨迹。转换前会自动去掉空格和换行；勾选展示过程可以查看排列与读取方式。">❓</button>`;
        }

        container.innerHTML = `<div class="stack">
                <textarea class="text-input" placeholder="输入要转换的文本"></textarea>
                <div class="controls-row">
                    <label title="方式">
                        <select class="text-input" data-role="rail-method" style="min-height:44px;max-width:190px;">
                            <option value="straight">直栏式分栏</option>
                            <option value="zigzag">W 型轨迹</option>
                        </select>
                    </label>
                    <label title="栏数">
                        <input class="rail-input" type="number" min="2" max="8" step="1" value="3" aria-label="栏数">
                    </label>
                    <label style="display:inline-flex;align-items:center;gap:8px;min-height:44px;color:var(--text-sub);">
                        <input type="checkbox" data-role="show-process">
                        展示过程
                    </label>
                    <button class="action-btn" data-action="encrypt">加密</button>
                    <button class="action-btn" data-action="decrypt">解密</button>
                    <button class="action-btn warn" data-action="clear">清空</button>
                </div>
                <textarea class="text-output" readonly placeholder="转换结果会显示在这里"></textarea>
                <div data-role="process-wrap" style="display:none;">
                    <textarea class="text-output" data-role="process-output" readonly style="min-height:170px;font-family:Consolas,'Courier New',monospace;white-space:pre;" placeholder="勾选展示过程后会显示排列方式"></textarea>
                </div>
            </div>`;

        const methodSelect = container.querySelector('[data-role="rail-method"]');
        const railsInput = container.querySelector(".rail-input");
        const input = container.querySelector(".text-input");
        const output = container.querySelector(".text-output");
        const showProcess = container.querySelector('[data-role="show-process"]');
        const processWrap = container.querySelector('[data-role="process-wrap"]');
        const processOutput = container.querySelector('[data-role="process-output"]');
        const encryptBtn = container.querySelector('[data-action="encrypt"]');
        const decryptBtn = container.querySelector('[data-action="decrypt"]');
        const clearBtn = container.querySelector('[data-action="clear"]');

        const getRails = () => {
            const count = Number.parseInt(railsInput.value, 10);
            if (!Number.isInteger(count) || count < 2 || count > 8) {
                helpers.showToast("栏数必须是 2 到 8 的整数");
                helpers.shake(railsInput);
                return null;
            }
            return count;
        };

        const normalizeText = (text) => text.replace(/\s+/g, "");

        const renderRows = (rows) => rows.map((row) => row.map((cell) => cell || "·").join(" ")).join("\n");

        const encryptStraight = (text, rails) => {
            const rowCount = Math.ceil(text.length / rails);
            const rows = Array.from({ length: rowCount }, () => Array.from({ length: rails }, () => ""));

            for (let index = 0; index < text.length; index += 1) {
                rows[Math.floor(index / rails)][index % rails] = text[index];
            }

            const parts = [];
            for (let col = 0; col < rails; col += 1) {
                let part = "";
                for (let row = 0; row < rowCount; row += 1) {
                    if (rows[row][col]) part += rows[row][col];
                }
                parts.push(part);
            }

            return {
                result: parts.join(""),
                process: [
                    `方式：直栏式分栏加密`,
                    `清理后文本：${text}`,
                    `按行写入 ${rails} 栏：`,
                    renderRows(rows),
                    `按列读取：${parts.map((part, index) => `第${index + 1}栏 ${part}`).join(" / ")}`,
                    `结果：${parts.join("")}`
                ].join("\n")
            };
        };

        const decryptStraight = (cipher, rails) => {
            const rowCount = Math.ceil(cipher.length / rails);
            const remainder = cipher.length % rails;
            const colLengths = Array.from({ length: rails }, (_, col) => {
                if (remainder === 0) return rowCount;
                return col < remainder ? rowCount : rowCount - 1;
            });
            const rows = Array.from({ length: rowCount }, () => Array.from({ length: rails }, () => ""));
            const parts = [];
            let cursor = 0;

            for (let col = 0; col < rails; col += 1) {
                const part = cipher.slice(cursor, cursor + colLengths[col]);
                parts.push(part);
                cursor += colLengths[col];
                for (let row = 0; row < part.length; row += 1) {
                    rows[row][col] = part[row];
                }
            }

            const result = rows.map((row) => row.join("")).join("");
            return {
                result,
                process: [
                    `方式：直栏式分栏解密`,
                    `清理后文本：${cipher}`,
                    `按列还原：${parts.map((part, index) => `第${index + 1}栏 ${part}`).join(" / ")}`,
                    `还原排列：`,
                    renderRows(rows),
                    `按行读取结果：${result}`
                ].join("\n")
            };
        };

        const buildZigzagPattern = (length, rails) => {
            const pattern = [];
            let rail = 0;
            let direction = 1;
            for (let index = 0; index < length; index += 1) {
                pattern.push(rail);
                rail += direction;
                if (rail === rails - 1 || rail === 0) direction *= -1;
            }
            return pattern;
        };

        const rowsFromPattern = (text, pattern, rails) => {
            const rows = Array.from({ length: rails }, () => Array.from({ length: text.length }, () => ""));
            for (let index = 0; index < text.length; index += 1) {
                rows[pattern[index]][index] = text[index];
            }
            return rows;
        };

        const encryptZigzag = (text, rails) => {
            const fence = Array.from({ length: rails }, () => []);
            const pattern = buildZigzagPattern(text.length, rails);
            for (let index = 0; index < text.length; index += 1) {
                fence[pattern[index]].push(text[index]);
            }
            const result = fence.flat().join("");
            return {
                result,
                process: [
                    `方式：W 型轨迹加密`,
                    `清理后文本：${text}`,
                    `按 W 型轨迹写入 ${rails} 轨：`,
                    renderRows(rowsFromPattern(text, pattern, rails)),
                    `逐轨读取：${fence.map((part, index) => `第${index + 1}轨 ${part.join("")}`).join(" / ")}`,
                    `结果：${result}`
                ].join("\n")
            };
        };

        const decryptZigzag = (cipher, rails) => {
            const pattern = buildZigzagPattern(cipher.length, rails);
            const sizes = Array.from({ length: rails }, () => 0);
            pattern.forEach((index) => {
                sizes[index] += 1;
            });

            const groups = [];
            let cursor = 0;
            for (const size of sizes) {
                groups.push(cipher.slice(cursor, cursor + size).split(""));
                cursor += size;
            }

            const result = pattern.map((index) => groups[index].shift()).join("");
            return {
                result,
                process: [
                    `方式：W 型轨迹解密`,
                    `清理后文本：${cipher}`,
                    `按轨拆分：${sizes.map((size, index) => `第${index + 1}轨 ${size} 字符`).join(" / ")}`,
                    `还原轨迹：`,
                    renderRows(rowsFromPattern(result, pattern, rails)),
                    `按 W 型轨迹读取结果：${result}`
                ].join("\n")
            };
        };

        const convert = (mode, text, rails, method) => {
            if (method === "zigzag") {
                return mode === "encrypt" ? encryptZigzag(text, rails) : decryptZigzag(text, rails);
            }
            return mode === "encrypt" ? encryptStraight(text, rails) : decryptStraight(text, rails);
        };

        const run = (mode) => {
            const rails = getRails();
            if (rails === null) return;
            const cleanText = normalizeText(input.value);
            if (!cleanText) {
                helpers.showToast("请先输入内容");
                helpers.shake(input);
                return;
            }
            const result = convert(mode, cleanText, rails, methodSelect.value);
            output.value = result.result;
            processOutput.value = result.process;
            processWrap.style.display = showProcess.checked ? "" : "none";
        };

        showProcess.addEventListener("change", () => {
            processWrap.style.display = showProcess.checked ? "" : "none";
        });
        encryptBtn.addEventListener("click", () => run("encrypt"));
        decryptBtn.addEventListener("click", () => run("decrypt"));
        clearBtn.addEventListener("click", () => {
            input.value = "";
            output.value = "";
            processOutput.value = "";
            processWrap.style.display = "none";
            showProcess.checked = false;
            input.focus();
        });

        return () => {
            if (headerActions) headerActions.innerHTML = "";
        };
    }
})();
