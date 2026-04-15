(function () {
    const { mountCodec } = window.FixedToolUtils;
    window.FixedToolRegistry.register({
        id: "binary",
        name: "二进制 ASCII",
        icon: "💻",
        desc: "文本与8位二进制互转。",
        tags: ["binary", "ascii", "2进制", "erjinzhi", "erjin", "ejz", "0101", "erji", "ejs"],
        mount: (container, helpers) =>
            mountCodec(container, helpers, {
                modeHint: "示例：A -> 01000001（空格分隔多个字节）",
                sourceLabel: "输入文本",
                targetLabel: "输出结果",
                sourcePlaceholder: "输入文本或二进制字节",
                encodeLabel: "文本 -> 二进制",
                decodeLabel: "二进制 -> 文本",
                encode: (value) =>
                    Array.from(value)
                        .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
                        .join(" "),
                decode: (value) =>
                    value
                        .trim()
                        .split(/\s+/)
                        .map((token) => {
                            if (/^[01]{8}$/.test(token)) return String.fromCharCode(parseInt(token, 2));
                            return token;
                        })
                        .join("")
            })
    });
})();
