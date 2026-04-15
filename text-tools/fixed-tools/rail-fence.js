(function () {
    window.FixedToolRegistry.register({
        id: "rail-fence",
        name: "栅栏密码",
        icon: "🧱",
        desc: "分栏重排加解密。",
        tags: ["栅栏", "rail fence", "分栏", "zhalan", "zhalanmima", "zlm", "fenchong", "fenjie"],
        mount: mountRailFence
    });

    function mountRailFence(container, helpers) {
        container.innerHTML = `<div class="panel-note">栅栏密码支持 2~8 栏。加密是按轨迹写入再逐栏读取，解密为逆过程。</div>
            <div class="stack">
                <div>
                    <label class="input-label">栏数</label>
                    <input class="rail-input" type="number" min="2" max="8" step="1" value="3">
                </div>
                <div>
                    <label class="input-label">输入文本</label>
                    <textarea class="text-input" placeholder="输入要转换的文本"></textarea>
                </div>
                <div class="controls-row">
                    <button class="action-btn" data-action="encrypt">加密（写栏）</button>
                    <button class="action-btn" data-action="decrypt">解密（读栏）</button>
                    <button class="action-btn warn" data-action="clear">清空</button>
                </div>
                <div>
                    <label class="input-label">输出结果</label>
                    <textarea class="text-output" readonly placeholder="转换结果会显示在这里"></textarea>
                </div>
            </div>`;

        const railsInput = container.querySelector(".rail-input");
        const input = container.querySelector(".text-input");
        const output = container.querySelector(".text-output");
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

        const encrypt = (text, rails) => {
            if (text.length <= 2 || rails === 1) return text;
            const fence = Array.from({ length: rails }, () => []);
            let rail = 0;
            let direction = 1;
            for (const char of text) {
                fence[rail].push(char);
                rail += direction;
                if (rail === rails - 1 || rail === 0) direction *= -1;
            }
            return fence.flat().join("");
        };

        const decrypt = (cipher, rails) => {
            if (cipher.length <= 2 || rails === 1) return cipher;
            const pattern = [];
            let rail = 0;
            let direction = 1;
            for (let i = 0; i < cipher.length; i += 1) {
                pattern.push(rail);
                rail += direction;
                if (rail === rails - 1 || rail === 0) direction *= -1;
            }

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

            return pattern.map((index) => groups[index].shift()).join("");
        };

        const run = (mode) => {
            const rails = getRails();
            if (rails === null) return;
            if (!input.value.trim()) {
                helpers.showToast("请先输入内容");
                helpers.shake(input);
                return;
            }
            output.value = mode === "encrypt" ? encrypt(input.value, rails) : decrypt(input.value, rails);
        };

        encryptBtn.addEventListener("click", () => run("encrypt"));
        decryptBtn.addEventListener("click", () => run("decrypt"));
        clearBtn.addEventListener("click", () => {
            input.value = "";
            output.value = "";
            input.focus();
        });

        return () => {};
    }
})();
