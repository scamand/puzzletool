(function () {
    const { mountCodec, rot13 } = window.FixedToolUtils;
    window.FixedToolRegistry.register({
        id: "rot13",
        name: "ROT13",
        icon: "🔄",
        desc: "固定轮转 13 位。",
        tags: ["rot13", "轮转", "lunzhuan", "lz", "lzm", "xuanhuan"],
        mount: (container, helpers) =>
            mountCodec(container, helpers, {
                modeHint: "ROT13 可逆，转换两次会回到原文。",
                sourceLabel: "输入文本",
                targetLabel: "输出结果",
                sourcePlaceholder: "输入任意文本",
                encodeLabel: "执行 ROT13",
                decodeLabel: "执行 ROT13",
                encode: rot13,
                decode: rot13
            })
    });
})();
