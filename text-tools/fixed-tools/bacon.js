(function () {
    const { BACON, mountCodec } = window.FixedToolUtils;
    window.FixedToolRegistry.register({
        id: "bacon",
        name: "培根密码",
        icon: "BA",
        desc: "A/B 五位组编码。",
        tags: ["bacon", "AB", "五位", "peigen", "peigenmi", "peigenma", "pgm"],
        mount: (container, helpers) =>
            mountCodec(container, helpers, {
                modeHint: "示例：HELLO -> AABBB AABAA ABABB ABABB ABBBA",
                sourceLabel: "输入文本",
                targetLabel: "输出结果",
                sourcePlaceholder: "输入字母文本或A/B编码",
                encodeLabel: "文本 -> 培根",
                decodeLabel: "培根 -> 文本",
                encode: (value) =>
                    value
                        .toUpperCase()
                        .split("")
                        .map((char) => {
                            if (/[A-Z]/.test(char)) return BACON.map[char];
                            return char === " " ? "/" : char;
                        })
                        .join(" "),
                decode: (value) =>
                    value
                        .trim()
                        .split(/\s+/)
                        .map((token) => {
                            if (token === "/") return " ";
                            if (/^[AB]{5}$/i.test(token)) return BACON.reverse[token.toUpperCase()] || "?";
                            return token;
                        })
                        .join("")
            })
    });
})();
