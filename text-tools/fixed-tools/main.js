(() => {
    if (typeof window.initThemeManager === "function") {
        window.initThemeManager({ allowToggle: false });
    }

    const helpBtn = document.getElementById("helpBtn");
    const helpModal = document.getElementById("helpModal");
    const closeModal = document.getElementById("closeModal");
    const cardsRoot = document.getElementById("cardsRoot");
    const cardsStage = document.getElementById("cardsStage");
    const edgeAddBtn = document.getElementById("edgeAddBtn");
    const mobileAddBtn = document.getElementById("mobileAddBtn");
    const toast = document.getElementById("toast");

    if (
        !helpBtn ||
        !helpModal ||
        !closeModal ||
        !cardsRoot ||
        !cardsStage ||
        !edgeAddBtn ||
        !mobileAddBtn ||
        !toast
    ) {
        return;
    }

    const registry = window.FixedToolRegistry;
    const utils = window.FixedToolUtils;
    if (!registry || !utils) {
        toast.textContent = "固定密码工具加载失败，请刷新页面重试";
        toast.classList.add("show");
        return;
    }

    const TOOLS = registry.getTools();
    const TOOL_MAP = registry.getToolMap();
    const { shake } = utils;

    helpBtn.addEventListener("click", () => helpModal.classList.add("show"));
    closeModal.addEventListener("click", () => helpModal.classList.remove("show"));
    helpModal.addEventListener("click", (event) => {
        if (event.target === helpModal) helpModal.classList.remove("show");
    });

    let toastTimer = null;

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
    }

    const isDesktopPointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let hideTimer = null;
    let pendingCardId = null;
    let pendingEdge = null;

    function showAddButton(card, edge) {
        clearTimeout(hideTimer);
        const rect = card.element.getBoundingClientRect();
        const stageRect = cardsStage.getBoundingClientRect();
        const size = 44;
        let x;
        let y;
        if (edge === "top") {
            x = rect.left - stageRect.left + rect.width / 2 - size / 2;
            y = rect.top - stageRect.top - size / 2;
        } else if (edge === "bottom") {
            x = rect.left - stageRect.left + rect.width / 2 - size / 2;
            y = rect.bottom - stageRect.top - size / 2;
        } else if (edge === "left") {
            x = rect.left - stageRect.left - size / 2;
            y = rect.top - stageRect.top + rect.height / 2 - size / 2;
        } else {
            x = rect.right - stageRect.left - size / 2;
            y = rect.top - stageRect.top + rect.height / 2 - size / 2;
        }

        edgeAddBtn.style.left = `${x}px`;
        edgeAddBtn.style.top = `${y}px`;
        edgeAddBtn.classList.add("show");
        pendingCardId = card.id;
        pendingEdge = edge;
    }

    function hideAddButton() {
        edgeAddBtn.classList.remove("show");
        pendingCardId = null;
        pendingEdge = null;
    }

    function scheduleHide() {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(hideAddButton, 160);
    }

    edgeAddBtn.addEventListener("mouseenter", () => clearTimeout(hideTimer));
    edgeAddBtn.addEventListener("mouseleave", scheduleHide);
    edgeAddBtn.addEventListener("click", () => {
        if (pendingCardId !== null && pendingEdge !== null) {
            workspace.addCard(pendingCardId, pendingEdge);
            hideAddButton();
        }
    });

    class ToolCard {
        constructor(ws, id) {
            this.workspace = ws;
            this.id = id;
            this.toolId = null;
            this.cleanup = null;
            this.element = this.createElement();
            this.contentEl = this.element.querySelector(".card-content");
            this.render();
        }

        createElement() {
            const wrap = document.createElement("section");
            wrap.className = "tool-card";
            wrap.innerHTML = `<div class="card-content"></div>
                <div class="card-edge-sensor" data-edge="top"></div>
                <div class="card-edge-sensor" data-edge="bottom"></div>
                <div class="card-edge-sensor" data-edge="left"></div>
                <div class="card-edge-sensor" data-edge="right"></div>`;

            if (isDesktopPointer) {
                wrap.querySelectorAll(".card-edge-sensor").forEach((sensor) => {
                    const edge = sensor.dataset.edge;
                    sensor.addEventListener("mouseenter", () => {
                        if (this.workspace.getAvailableSides(this.id).has(edge)) {
                            showAddButton(this, edge);
                        }
                    });
                    sensor.addEventListener("mouseleave", scheduleHide);
                });
            }
            return wrap;
        }

        disposeTool() {
            if (typeof this.cleanup === "function") this.cleanup();
            this.cleanup = null;
        }

        render() {
            this.disposeTool();
            if (this.toolId) this.renderToolView();
            else this.renderSelectView();
            this.updateButtons();
        }

        renderSelectView() {
            const canClose = this.workspace.totalCards > 1;
            this.contentEl.innerHTML = `<div class="view-header">
                    <div class="glow-head"><span class="glow-head-title">选择固定密码工具</span></div>
                    <button class="close-btn ${canClose ? "" : "hidden"}" data-action="remove" title="关闭当前卡片">×</button>
                </div>
                <div class="select-body">
                    <div class="search-wrap">
                        <span class="search-icon">🔍</span>
                        <input class="search-input" type="text" placeholder="搜索工具名或关键词">
                    </div>
                    <div class="tool-grid"></div>
                </div>`;

            const searchInput = this.contentEl.querySelector(".search-input");
            const grid = this.contentEl.querySelector(".tool-grid");
            const removeBtn = this.contentEl.querySelector('[data-action="remove"]');

            const paint = (keyword = "") => {
                const query = keyword.trim().toLowerCase();
                const list = TOOLS.filter((tool) => {
                    if (!query) return true;
                    if (tool.name.toLowerCase().includes(query)) return true;
                    if (tool.desc.toLowerCase().includes(query)) return true;
                    if (tool.icon.includes(query)) return true;
                    return tool.tags.some((tag) => tag.toLowerCase().includes(query));
                });

                if (!list.length) {
                    grid.innerHTML = '<div class="tool-empty">没有匹配结果，换个关键词试试。</div>';
                    return;
                }

                grid.innerHTML = list
                    .map(
                        (tool) => `<button class="tool-picker" type="button" data-tool="${tool.id}">
                            <div class="picker-head"><span>${tool.icon}</span><span>${tool.name}</span></div>
                            <div class="picker-desc">${tool.desc}</div>
                        </button>`
                    )
                    .join("");
            };

            paint();
            searchInput.addEventListener("input", (event) => paint(event.target.value));
            grid.addEventListener("click", (event) => {
                const button = event.target.closest(".tool-picker");
                if (!button) return;
                this.toolId = button.dataset.tool;
                this.render();
            });

            if (removeBtn) {
                removeBtn.addEventListener("click", () => this.workspace.removeCard(this.id));
            }
        }

        renderToolView() {
            const tool = TOOL_MAP[this.toolId];
            if (!tool) {
                this.toolId = null;
                this.renderSelectView();
                return;
            }

            const canClose = this.workspace.totalCards > 1;
            this.contentEl.innerHTML = `<div class="pane-header">
                    <div class="glow-head">
                        <span class="glow-head-title">${tool.icon} ${tool.name}</span>
                        <button class="mini-btn" data-action="back">返回工具选择</button>
                    </div>
                    <button class="close-btn ${canClose ? "" : "hidden"}" data-action="remove" title="关闭当前卡片">×</button>
                </div>
                <div class="pane-body" data-role="tool-body"></div>`;

            const body = this.contentEl.querySelector('[data-role="tool-body"]');
            this.cleanup = tool.mount(body, { showToast, shake }) || null;
            this.contentEl.querySelector('[data-action="back"]').addEventListener("click", () => {
                this.toolId = null;
                this.render();
            });

            const removeBtn = this.contentEl.querySelector('[data-action="remove"]');
            if (removeBtn) {
                removeBtn.addEventListener("click", () => this.workspace.removeCard(this.id));
            }
        }

        updateButtons() {
            this.contentEl.querySelectorAll('[data-action="remove"]').forEach((button) => {
                button.classList.toggle("hidden", this.workspace.totalCards <= 1);
            });
        }

        updateEdgeSensors() {
            const available = this.workspace.getAvailableSides(this.id);
            this.element.querySelectorAll(".card-edge-sensor").forEach((sensor) => {
                sensor.style.display = available.has(sensor.dataset.edge) ? "" : "none";
            });
        }

        destroy() {
            this.disposeTool();
            this.element.remove();
        }
    }

    class Row {
        constructor() {
            this.cards = [];
            this.el = document.createElement("div");
            this.el.className = "cards-row";
        }
    }

    class Workspace {
        constructor(root) {
            this.root = root;
            this.grid = [];
            this.seed = 1;
        }

        get totalCards() {
            return this.grid.reduce((sum, row) => sum + row.cards.length, 0);
        }

        canAdd() {
            return this.totalCards < 4;
        }

        findCardPosition(cardId) {
            for (let rowIndex = 0; rowIndex < this.grid.length; rowIndex += 1) {
                const colIndex = this.grid[rowIndex].cards.findIndex((card) => card.id === cardId);
                if (colIndex >= 0) return { r: rowIndex, c: colIndex };
            }
            return null;
        }

        getAvailableSides(cardId) {
            if (!this.canAdd()) return new Set();
            const pos = this.findCardPosition(cardId);
            if (!pos) return new Set();
            const { r, c } = pos;
            const row = this.grid[r];
            const sides = new Set();
            if (c === 0 && row.cards.length < 2) sides.add("left");
            if (c === row.cards.length - 1 && row.cards.length < 2) sides.add("right");
            if (r === 0 && this.grid.length < 2) sides.add("top");
            if (r === this.grid.length - 1 && this.grid.length < 2) sides.add("bottom");
            return sides;
        }

        addCard(cardId, edge) {
            if (!this.canAdd()) {
                showToast("最多可同时打开 4 张卡片（2行×2列）");
                return;
            }
            const pos = this.findCardPosition(cardId);
            if (!pos) return;
            hideAddButton();
            const { r, c } = pos;
            const newCard = new ToolCard(this, this.seed++);

            if (edge === "left") {
                const row = this.grid[r];
                const reference = row.el.children[c];
                row.cards.splice(c, 0, newCard);
                row.el.insertBefore(newCard.element, reference);
            } else if (edge === "right") {
                const row = this.grid[r];
                const reference = row.el.children[c + 1] || null;
                row.cards.splice(c + 1, 0, newCard);
                row.el.insertBefore(newCard.element, reference);
            } else if (edge === "top") {
                const newRow = new Row();
                newRow.cards.push(newCard);
                newRow.el.appendChild(newCard.element);
                this.grid.splice(r, 0, newRow);
                this.root.insertBefore(newRow.el, this.grid[r + 1].el);
            } else {
                const newRow = new Row();
                newRow.cards.push(newCard);
                newRow.el.appendChild(newCard.element);
                this.grid.splice(r + 1, 0, newRow);
                const nextRow = this.grid[r + 2];
                if (nextRow) this.root.insertBefore(newRow.el, nextRow.el);
                else this.root.appendChild(newRow.el);
            }

            this.updateAllCards();
            mobileAddBtn.disabled = !this.canAdd();
        }

        removeCard(cardId) {
            if (this.totalCards <= 1) {
                showToast("至少需要保留一张卡片");
                return;
            }

            const pos = this.findCardPosition(cardId);
            if (!pos) return;
            hideAddButton();
            const { r, c } = pos;
            const row = this.grid[r];
            const [card] = row.cards.splice(c, 1);
            card.destroy();

            if (row.cards.length === 0) {
                this.root.removeChild(row.el);
                this.grid.splice(r, 1);
            }

            this.updateAllCards();
            mobileAddBtn.disabled = !this.canAdd();
        }

        updateAllCards() {
            for (const row of this.grid) {
                for (const card of row.cards) {
                    card.updateButtons();
                    card.updateEdgeSensors();
                }
            }
        }

        init() {
            const card = new ToolCard(this, this.seed++);
            const row = new Row();
            row.cards.push(card);
            row.el.appendChild(card.element);
            this.grid.push(row);
            this.root.appendChild(row.el);
            this.updateAllCards();
            mobileAddBtn.disabled = !this.canAdd();
        }
    }

    const workspace = new Workspace(cardsRoot);

    mobileAddBtn.addEventListener("click", () => {
        if (!workspace.canAdd()) {
            showToast("最多可同时打开 4 张卡片（2行×2列）");
            return;
        }

        hideAddButton();
        const newCard = new ToolCard(workspace, workspace.seed++);
        const lastRow = workspace.grid[workspace.grid.length - 1];
        if (lastRow.cards.length < 2) {
            lastRow.cards.push(newCard);
            lastRow.el.appendChild(newCard.element);
        } else {
            const newRow = new Row();
            newRow.cards.push(newCard);
            newRow.el.appendChild(newCard.element);
            workspace.grid.push(newRow);
            workspace.root.appendChild(newRow.el);
        }
        workspace.updateAllCards();
        mobileAddBtn.disabled = !workspace.canAdd();
    });

    workspace.init();
})();
