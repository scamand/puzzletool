(function () {
    const tools = [];
    const toolMap = Object.create(null);

    window.FixedToolRegistry = {
        register(tool) {
            if (!tool || !tool.id || toolMap[tool.id]) return;
            tools.push(tool);
            toolMap[tool.id] = tool;
        },
        getTools() {
            return tools.slice();
        },
        getToolMap() {
            return { ...toolMap };
        }
    };
})();
