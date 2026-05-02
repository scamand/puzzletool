(function () {
    const MORSE_MAP = {
        A: ".-",
        B: "-...",
        C: "-.-.",
        D: "-..",
        E: ".",
        F: "..-.",
        G: "--.",
        H: "....",
        I: "..",
        J: ".---",
        K: "-.-",
        L: ".-..",
        M: "--",
        N: "-.",
        O: "---",
        P: ".--.",
        Q: "--.-",
        R: ".-.",
        S: "...",
        T: "-",
        U: "..-",
        V: "...-",
        W: ".--",
        X: "-..-",
        Y: "-.--",
        Z: "--..",
        0: "-----",
        1: ".----",
        2: "..---",
        3: "...--",
        4: "....-",
        5: ".....",
        6: "-....",
        7: "--...",
        8: "---..",
        9: "----.",
        ".": ".-.-.-",
        ",": "--..--",
        "?": "..--..",
        "!": "-.-.--",
        "-": "-....-"
    };

    const MORSE_REVERSE = Object.fromEntries(
        Object.entries(MORSE_MAP).map(([key, value]) => [value, key])
    );

    const BACON = (() => {
        const map = {};
        const reverse = {};
        for (let i = 0; i < 26; i += 1) {
            const letter = String.fromCharCode(65 + i);
            const code = i
                .toString(2)
                .padStart(5, "0")
                .replace(/0/g, "A")
                .replace(/1/g, "B");
            map[letter] = code;
            reverse[code] = letter;
        }
        return { map, reverse };
    })();

    function shake(element) {
        element.classList.remove("shake");
        void element.offsetWidth;
        element.classList.add("shake");
    }

    function rot13(input) {
        return input.replace(/[a-zA-Z]/g, (char) => {
            const base = char <= "Z" ? 65 : 97;
            return String.fromCharCode(((char.charCodeAt(0) - base + 13) % 26) + base);
        });
    }

    function mountCodec(container, helpers, cfg) {
        container.innerHTML = `<div class="panel-note">${cfg.modeHint}</div>
            <div class="stack">
                <div>
                    <label class="input-label">${cfg.sourceLabel}</label>
                    <textarea class="text-input" placeholder="${cfg.sourcePlaceholder}"></textarea>
                </div>
                <div class="controls-row">
                    <button class="action-btn" data-action="encode">${cfg.encodeLabel}</button>
                    <button class="action-btn" data-action="decode">${cfg.decodeLabel}</button>
                    <button class="action-btn warn" data-action="clear">清空</button>
                </div>
                <div>
                    <label class="input-label">${cfg.targetLabel}</label>
                    <textarea class="text-output" readonly placeholder="转换结果会显示在这里"></textarea>
                </div>
            </div>`;

        const input = container.querySelector(".text-input");
        const output = container.querySelector(".text-output");
        const encodeBtn = container.querySelector('[data-action="encode"]');
        const decodeBtn = container.querySelector('[data-action="decode"]');
        const clearBtn = container.querySelector('[data-action="clear"]');

        const run = (fn) => {
            if (!input.value.trim()) {
                helpers.showToast("请先输入内容");
                helpers.shake(input);
                return;
            }
            output.value = fn(input.value);
        };

        encodeBtn.addEventListener("click", () => run(cfg.encode));
        decodeBtn.addEventListener("click", () => run(cfg.decode));
        clearBtn.addEventListener("click", () => {
            input.value = "";
            output.value = "";
            input.focus();
        });

        return () => {};
    }

    window.FixedToolUtils = {
        MORSE_MAP,
        MORSE_REVERSE,
        BACON,
        shake,
        rot13,
        mountCodec
    };
})();
