(function () {
    const { mountCodec } = window.FixedToolUtils;
    window.FixedToolRegistry.register({
        id: "a1z26",
        name: "A1Z26",
        icon: "🔢",
        desc: "字母与 1~26 对应。",
        tags: ["a1z26", "数字", "字母", "shuzi", "zimu", "szm", "zm", "zima", "a=1"],
        mount: (container, helpers) =>
            mountCodec(container, helpers, {
                modeHint: "示例：HELLO -> 8-5-12-12-15；词之间用 / 分隔。",
                sourceLabel: "输入文本",
                targetLabel: "输出结果",
                sourcePlaceholder: "输入文本或数字序列",
                encodeLabel: "文本 -> A1Z26",
                decodeLabel: "A1Z26 -> 文本",
                encode: (value) =>
                    value
                        .trim()
                        .split(/\s+/)
                        .map((word) =>
                            word
                                .split("")
                                .map((char) => {
                                    const code = char.toUpperCase().charCodeAt(0);
                                    if (code >= 65 && code <= 90) return String(code - 64);
                                    return char;
                                })
                                .join("-")
                        )
                        .join(" / "),
                decode: (value) =>
                    value
                        .trim()
                        .split(/\s*\/\s*/)
                        .map((word) =>
                            word
                                .split("-")
                                .map((token) => {
                                    const number = Number(token);
                                    if (Number.isInteger(number) && number >= 1 && number <= 26) {
                                        return String.fromCharCode(64 + number);
                                    }
                                    return token;
                                })
                                .join("")
                        )
                        .join(" ")
            })
    });
})();
