(function () {
    const BASES = [
        { id: "hex", label: "HEX", base: 16, keys: "0123456789ABCDEF" },
        { id: "dec", label: "DEC", base: 10, keys: "0123456789" },
        { id: "oct", label: "OCT", base: 8, keys: "01234567" },
        { id: "bin", label: "BIN", base: 2, keys: "01" }
    ];
    const KEY_ORDER = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];

    function parseToken(token, base) {
        let value = 0n;
        for (const char of token.toUpperCase()) {
            const digit = Number.parseInt(char, 16);
            if (!Number.isInteger(digit) || digit >= base) return null;
            value = value * BigInt(base) + BigInt(digit);
        }
        return value;
    }

    function parseGroups(value, base) {
        return value
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map((token) => parseToken(token, base))
            .filter((item) => item !== null);
    }

    function formatGroups(groups, base) {
        if (!groups.length) return "0";
        return groups.map((value) => value.toString(base).toUpperCase()).join(" ");
    }

    function mountProgrammerRadix(container, helpers, options = {}) {
        const headerActions = options.headerActions || null;
        if (headerActions) {
            headerActions.innerHTML = `<button class="head-help" type="button" data-tip="选择 HEX、DEC、OCT 或 BIN 后输入数字。空格分隔多个数字；Backspace 删除一位，Delete 清空。无效按键会变暗且无法输入。">❓</button>`;
        }

        let activeBase = 10;
        let inputValue = "";
        let cleanupKeyboard = null;

        container.innerHTML = `<div class="programmer-tool">
            <div class="radix-display" data-role="display">
                ${BASES.map((item) => `<div class="radix-row" role="button" tabindex="0" data-base="${item.base}">
                    <span class="radix-label">${item.label}</span>
                    <span class="radix-value" data-role="value-${item.base}">0</span>
                </div>`).join("")}
            </div>
            <div class="radix-keypad">
                ${KEY_ORDER.map((key) => `<button class="radix-key" type="button" data-key="${key}">${key}</button>`).join("")}
            </div>
        </div>`;

        const rows = Array.from(container.querySelectorAll(".radix-row"));
        const keys = Array.from(container.querySelectorAll(".radix-key"));

        const currentBaseInfo = () => BASES.find((item) => item.base === activeBase) || BASES[1];

        const flashKey = (key) => {
            const button = keys.find((item) => item.dataset.key === key);
            if (!button || button.disabled) return;
            button.classList.remove("flash");
            void button.offsetWidth;
            button.classList.add("flash");
        };

        const render = () => {
            const groups = parseGroups(inputValue, activeBase);

            rows.forEach((row) => {
                const base = Number.parseInt(row.dataset.base, 10);
                const valueEl = row.querySelector(".radix-value");
                row.classList.toggle("active", base === activeBase);
                valueEl.textContent = base === activeBase ? inputValue || "0" : formatGroups(groups, base);
            });

            const allowedKeys = currentBaseInfo().keys;
            keys.forEach((button) => {
                const enabled = allowedKeys.includes(button.dataset.key);
                button.disabled = !enabled;
                button.classList.toggle("disabled", !enabled);
            });
        };

        const chooseBase = (base) => {
            if (base === activeBase) return;
            const groups = parseGroups(inputValue, activeBase);
            activeBase = base;
            inputValue = groups.length ? formatGroups(groups, activeBase) : "";
            render();
        };

        const pressKey = (key) => {
            key = key.toUpperCase();
            if (!currentBaseInfo().keys.includes(key)) return;
            inputValue += key;
            flashKey(key);
            render();
        };

        const appendSpace = () => {
            if (!inputValue || inputValue.endsWith(" ")) return;
            inputValue += " ";
            render();
        };

        const backspace = () => {
            if (!inputValue) return;
            inputValue = inputValue.slice(0, -1);
            render();
        };

        const clear = () => {
            inputValue = "";
            render();
        };

        rows.forEach((row) => {
            row.addEventListener("click", () => chooseBase(Number.parseInt(row.dataset.base, 10)));
            row.addEventListener("keydown", (event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                chooseBase(Number.parseInt(row.dataset.base, 10));
            });
            row.querySelector(".radix-value").addEventListener("pointerdown", (event) => event.stopPropagation());
            row.querySelector(".radix-value").addEventListener("click", (event) => event.stopPropagation());
        });

        keys.forEach((button) => {
            button.addEventListener("click", () => pressKey(button.dataset.key));
        });

        const onKeyDown = (event) => {
            const card = container.closest(".tool-card");
            const isActiveCard = card && (card.matches(":hover") || card.contains(document.activeElement));
            if (!isActiveCard) return;

            const key = event.key.toUpperCase();
            if (KEY_ORDER.includes(key)) {
                if (!currentBaseInfo().keys.includes(key)) return;
                event.preventDefault();
                pressKey(key);
            } else if (event.key === " ") {
                event.preventDefault();
                appendSpace();
            } else if (event.key === "Backspace") {
                event.preventDefault();
                backspace();
            } else if (event.key === "Delete") {
                event.preventDefault();
                clear();
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
        id: "radix-converter",
        name: "进制转换",
        icon: "🧮",
        desc: "程序员模式进制换算。",
        tags: [
            "binary",
            "hex",
            "oct",
            "dec",
            "2进制",
            "8进制",
            "10进制",
            "16进制",
            "erjinzhi",
            "bajinzhi",
            "shijinzhi",
            "shiliujinzhi",
            "radix",
            "jinzhi",
            "jzzh"
        ],
        mount: mountProgrammerRadix
    });
})();
