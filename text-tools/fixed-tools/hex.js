(function () {
    const { mountCodec } = window.FixedToolUtils;
    window.FixedToolRegistry.register({
        id: "hex",
        name: "十六进制 ASCII",
        icon: "🔤",
        desc: "文本与十六进制互转。",
        tags: ["hex", "ascii", "16进制", "shiliujinzhi", "shiliu", "sljz", "16jz", "hexcode"],
        mount: (container, helpers) =>
            mountCodec(container, helpers, {
                modeHint: "示例：A -> 41（空格分隔多个字节）",
                sourceLabel: "输入文本",
                targetLabel: "输出结果",
                sourcePlaceholder: "输入文本或十六进制字节",
                encodeLabel: "文本 -> 十六进制",
                decodeLabel: "十六进制 -> 文本",
                encode: (value) =>
                    Array.from(value)
                        .map((char) => char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"))
                        .join(" "),
                decode: (value) =>
                    value
                        .trim()
                        .split(/\s+/)
                        .map((token) => {
                            if (/^[0-9A-Fa-f]{2}$/.test(token)) return String.fromCharCode(parseInt(token, 16));
                            return token;
                        })
                        .join("")
            })
    });
})();
