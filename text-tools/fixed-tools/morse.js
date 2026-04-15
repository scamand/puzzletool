(function () {
    const { MORSE_MAP, MORSE_REVERSE, mountCodec } = window.FixedToolUtils;
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

    window.FixedToolRegistry.register({
        id: "morse",
        name: "摩斯密码",
        icon: "📡",
        desc: "点划编码互转。",
        tags: ["morse", "点划", "编码", "mosi", "mosimima", "ms", "msm", ".-", "--", "dida", "嘀嗒", "dianda"],
        mount: (container, helpers) =>
            mountCodec(container, helpers, {
                modeHint: "示例：SOS -> ... --- ...；空格会编码为 /。中文会自动编码为可逆的 ZH+Unicode 形式。",
                sourceLabel: "输入文本",
                targetLabel: "输出结果",
                sourcePlaceholder: "输入要编码或解码的文本（支持中文）",
                encodeLabel: "文本 -> 摩斯",
                decodeLabel: "摩斯 -> 文本",
                encode: encodeMorse,
                decode: decodeMorse
            })
    });
})();
