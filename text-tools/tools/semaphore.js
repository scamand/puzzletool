(function () {
    const DIRECTIONS = [
        { key: "9", label: "右上", angle: -45 },
        { key: "6", label: "右", angle: 0 },
        { key: "3", label: "右下", angle: 45 },
        { key: "2", label: "下", angle: 90 },
        { key: "1", label: "左下", angle: 135 },
        { key: "4", label: "左", angle: 180 },
        { key: "7", label: "左上", angle: 225 },
        { key: "8", label: "上", angle: 270 }
    ];

    const LETTER_PAIRS = {
        A: ["2", "1"],
        B: ["2", "4"],
        C: ["2", "7"],
        D: ["2", "8"],
        E: ["9", "2"],
        F: ["6", "2"],
        G: ["3", "2"],
        H: ["1", "4"],
        I: ["1", "7"],
        K: ["1", "8"],
        L: ["9", "1"],
        M: ["6", "1"],
        N: ["3", "1"],
        O: ["4", "7"],
        P: ["4", "8"],
        Q: ["9", "4"],
        R: ["6", "4"],
        S: ["3", "4"],
        T: ["7", "8"],
        U: ["9", "7"],
        Y: ["6", "7"],
        J: ["6", "8"],
        V: ["8", "3"],
        W: ["9", "6"],
        X: ["9", "3"],
        Z: ["6", "3"]
    };

    const PAIR_TO_LETTER = Object.fromEntries(
        Object.entries(LETTER_PAIRS).map(([letter, pair]) => [pair.slice().sort((a, b) => a - b).join("-"), letter])
    );

    function mountSemaphore(container, helpers, options = {}) {
        const headerActions = options.headerActions || null;
        if (headerActions) {
            headerActions.innerHTML = `<button class="head-help" type="button" data-tip="点亮两根方向线组成旗语字母。方向按小键盘位置输入：从右上开始顺时针为 9 6 3 2 1 4 7 8，Delete 清空输出。">❓</button>`;
        }

        let selected = [];
        let outputValue = "";
        let cleanupKeyboard = null;

        container.innerHTML = `<div class="stack">
            <div class="semaphore-input">
                <div class="semaphore-wheel" aria-label="旗语方向选择">
                    ${DIRECTIONS.map((direction) => `<button class="semaphore-ray" type="button" data-key="${direction.key}" style="--angle:${direction.angle}deg" title="${direction.key} ${direction.label}" aria-label="${direction.key} ${direction.label}"></button>`).join("")}
                    <div class="semaphore-center-label" data-role="center-label">-</div>
                </div>
                <div class="semaphore-preview">
                    <div class="semaphore-combo" data-role="combo">等待输入</div>
                    <div class="semaphore-letter" data-role="letter">-</div>
                </div>
            </div>
            <textarea class="text-output" data-role="output" readonly placeholder="按 Enter 将有效字母写入这里"></textarea>
        </div>`;

        const rays = Array.from(container.querySelectorAll(".semaphore-ray"));
        const comboEl = container.querySelector('[data-role="combo"]');
        const letterEl = container.querySelector('[data-role="letter"]');
        const centerLabel = container.querySelector('[data-role="center-label"]');
        const output = container.querySelector('[data-role="output"]');

        function currentLetter() {
            if (selected.length !== 2) return "";
            return PAIR_TO_LETTER[selected.slice().sort((a, b) => a - b).join("-")] || "";
        }

        function flash(ray) {
            ray.classList.remove("flash");
            void ray.offsetWidth;
            ray.classList.add("flash");
        }

        function render() {
            const letter = currentLetter();
            rays.forEach((ray) => {
                ray.classList.toggle("active", selected.includes(ray.dataset.key));
            });
            comboEl.textContent = selected.length ? selected.join(" + ") : "等待输入";
            comboEl.classList.toggle("semaphore-muted", selected.length === 0);
            letterEl.textContent = letter || (selected.length === 2 ? "?" : "-");
            letterEl.classList.toggle("semaphore-muted", !letter);
            output.value = outputValue;
        }

        function toggleDirection(key) {
            if (!/^[1-9]$/.test(key) || key === "5") return;

            const index = selected.indexOf(key);
            if (index >= 0) {
                selected.splice(index, 1);
            } else {
                selected.push(key);
            }

            const ray = rays.find((item) => item.dataset.key === key);
            if (ray) flash(ray);
            render();
        }

        function commit() {
            const letter = currentLetter();
            if (!letter) return;
            outputValue += letter;
            selected = [];
            render();
        }

        function clearOutput() {
            outputValue = "";
            selected = [];
            render();
        }

        rays.forEach((ray) => {
            ray.addEventListener("click", () => toggleDirection(ray.dataset.key));
            ray.addEventListener("pointerenter", () => {
                centerLabel.textContent = ray.dataset.key;
                centerLabel.classList.add("active");
            });
            ray.addEventListener("pointerleave", () => {
                centerLabel.textContent = "-";
                centerLabel.classList.remove("active");
            });
        });

        const onKeyDown = (event) => {
            const card = container.closest(".tool-card");
            const isActiveCard = card && (card.matches(":hover") || card.contains(document.activeElement));
            if (!isActiveCard) return;

            if (/^[1-9]$/.test(event.key) && event.key !== "5") {
                event.preventDefault();
                toggleDirection(event.key);
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
        render();

        return () => {
            if (cleanupKeyboard) cleanupKeyboard();
            if (headerActions) headerActions.innerHTML = "";
        };
    }

    window.FixedToolRegistry.register({
        id: "semaphore",
        name: "旗语密码",
        icon: "🚩",
        desc: "双旗方向组合成字母。",
        tags: ["旗语", "semaphore", "flag", "信号旗", "方向", "qiyu", "qiyimima"],
        mount: mountSemaphore
    });
})();
