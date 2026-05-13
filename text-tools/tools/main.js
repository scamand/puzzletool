(() => {
    if (typeof window.initThemeManager === "function") {
        window.initThemeManager({ allowToggle: false });
    }

    const helpBtn = document.getElementById("helpBtn");
    const helpModal = document.getElementById("helpModal");
    const closeModal = document.getElementById("closeModal");
    const cardsRoot = document.getElementById("cardsRoot");
    const cardsStage = document.getElementById("cardsStage");
    const mobileAddBtn = document.getElementById("mobileAddBtn");
    const canvasMenu = document.getElementById("canvasMenu");
    const clearCardsBtn = document.getElementById("clearCardsBtn");
    const arrangeCardsBtn = document.getElementById("arrangeCardsBtn");
    const saveLayoutBtn = document.getElementById("saveLayoutBtn");
    const loadLayoutBtn = document.getElementById("loadLayoutBtn");
    const settingsBtn = document.getElementById("settingsBtn");
    const settingsModal = document.getElementById("settingsModal");
    const closeSettings = document.getElementById("closeSettings");
    const resetAllSettingsBtn = document.getElementById("resetAllSettingsBtn");
    const cardSettingsList = document.getElementById("cardSettingsList");
    const toast = document.getElementById("toast");

    if (
        !helpBtn ||
        !helpModal ||
        !closeModal ||
        !cardsRoot ||
        !cardsStage ||
        !mobileAddBtn ||
        !canvasMenu ||
        !clearCardsBtn ||
        !arrangeCardsBtn ||
        !saveLayoutBtn ||
        !loadLayoutBtn ||
        !settingsBtn ||
        !settingsModal ||
        !closeSettings ||
        !resetAllSettingsBtn ||
        !cardSettingsList ||
        !toast
    ) {
        return;
    }

    const registry = window.FixedToolRegistry;
    const utils = window.FixedToolUtils;
    if (!registry || !utils) {
        toast.textContent = "文字工具加载失败，请刷新页面重试";
        toast.classList.add("show");
        return;
    }

    const TOOLS = registry.getTools();
    const TOOL_MAP = registry.getToolMap();
    const { shake } = utils;
    const APP_CONFIG = window.TextToolsConfig || {};
    const CARD_CONFIG = APP_CONFIG.card || {};
    const STORAGE_CONFIG = APP_CONFIG.storage || {};

    helpBtn.addEventListener("click", () => helpModal.classList.add("show"));
    closeModal.addEventListener("click", () => helpModal.classList.remove("show"));
    helpModal.addEventListener("click", (event) => {
        if (event.target === helpModal) helpModal.classList.remove("show");
    });

    let toastTimer = null;
    let activeTooltipButton = null;
    let headTooltip = null;

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
    }

    function readNumber(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function readConfigNumber(value, name) {
        const number = Number(value);
        if (!Number.isFinite(number)) {
            throw new Error(`TextToolsConfig.${name} 必须是数字`);
        }
        return number;
    }

    const isDesktopPointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const MAX_CARDS = readConfigNumber(CARD_CONFIG.maxCards, "card.maxCards");
    const CARD_GAP = readConfigNumber(CARD_CONFIG.gap, "card.gap");
    const ARRANGE_MARGIN_X = readConfigNumber(CARD_CONFIG.arrangeMarginX, "card.arrangeMarginX");
    const ARRANGE_MARGIN_TOP = readConfigNumber(CARD_CONFIG.arrangeMarginTop, "card.arrangeMarginTop");
    const DEFAULT_CARD_WIDTH = readConfigNumber(CARD_CONFIG.defaultWidth, "card.defaultWidth");
    const DEFAULT_CARD_HEIGHT = readConfigNumber(CARD_CONFIG.defaultHeight, "card.defaultHeight");
    const CARD_MIN_WIDTH = readConfigNumber(CARD_CONFIG.minWidth, "card.minWidth");
    const CARD_MIN_HEIGHT = readConfigNumber(CARD_CONFIG.minHeight, "card.minHeight");
    const AUTO_FIT_PADDING = readConfigNumber(CARD_CONFIG.autoFitPadding, "card.autoFitPadding");
    const LAYOUT_STORAGE_KEY = STORAGE_CONFIG.layout;
    const CARD_DEFAULTS_STORAGE_KEY = STORAGE_CONFIG.cardDefaults;
    let menuPoint = null;
    let menuCard = null;
    let suppressContextMenu = false;
    let cardDefaultPrefs = loadCardDefaultPrefs();

    function applyCardCssVariables() {
        const root = document.querySelector(".fixed-shell") || document.documentElement;
        root.style.setProperty("--tool-card-default-width", `${DEFAULT_CARD_WIDTH}px`);
        root.style.setProperty("--tool-card-default-height", `${DEFAULT_CARD_HEIGHT}px`);
        root.style.setProperty("--tool-card-min-width", `${CARD_MIN_WIDTH}px`);
        root.style.setProperty("--tool-card-min-height", `${CARD_MIN_HEIGHT}px`);
    }

    function loadCardDefaultPrefs() {
        try {
            const data = JSON.parse(window.localStorage.getItem(CARD_DEFAULTS_STORAGE_KEY) || "{}");
            return data && typeof data === "object" && data.tools && typeof data.tools === "object" ? data : { tools: {} };
        } catch (_) {
            return { tools: {} };
        }
    }

    function saveCardDefaultPrefs() {
        try {
            window.localStorage.setItem(CARD_DEFAULTS_STORAGE_KEY, JSON.stringify(cardDefaultPrefs));
            return true;
        } catch (_) {
            showToast("保存失败，浏览器可能限制了本地存储");
            return false;
        }
    }

    function normalizeSize(width, height) {
        return {
            width: Math.max(CARD_MIN_WIDTH, Math.round(readNumber(width, DEFAULT_CARD_WIDTH))),
            height: Math.max(CARD_MIN_HEIGHT, Math.round(readNumber(height, DEFAULT_CARD_HEIGHT)))
        };
    }

    function getToolDefaultSize(toolId) {
        if (!toolId || !cardDefaultPrefs.tools[toolId]) return null;
        const size = normalizeSize(cardDefaultPrefs.tools[toolId].width, cardDefaultPrefs.tools[toolId].height);
        return Number.isFinite(size.width) && Number.isFinite(size.height) ? size : null;
    }

    function setToolDefaultSize(toolId, width, height) {
        if (!toolId || !TOOL_MAP[toolId]) return false;
        cardDefaultPrefs.tools[toolId] = normalizeSize(width, height);
        return saveCardDefaultPrefs();
    }

    function clearToolDefaultSize(toolId) {
        if (!toolId || !cardDefaultPrefs.tools[toolId]) return false;
        delete cardDefaultPrefs.tools[toolId];
        return saveCardDefaultPrefs();
    }

    function clearAllToolDefaultSizes() {
        cardDefaultPrefs = { tools: {} };
        return saveCardDefaultPrefs();
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char]));
    }

    function getDisplaySize(toolId) {
        return getToolDefaultSize(toolId) || { width: DEFAULT_CARD_WIDTH, height: DEFAULT_CARD_HEIGHT };
    }

    function renderCardSettings() {
        if (!TOOLS.length) {
            cardSettingsList.innerHTML = '<div class="settings-empty">暂无可设置的工具。</div>';
            return;
        }

        cardSettingsList.innerHTML = TOOLS.map((tool) => {
            const size = getDisplaySize(tool.id);
            const isCustom = Boolean(cardDefaultPrefs.tools[tool.id]);
            const otherTools = TOOLS.filter((item) => item.id !== tool.id);
            return `<details class="settings-row" data-tool="${escapeHTML(tool.id)}">
                <summary>
                    <span class="settings-row-title">${escapeHTML(tool.icon)} ${escapeHTML(tool.name)}</span>
                    <span class="settings-row-meta">${isCustom ? "自定义" : "默认"} · ${size.width} × ${size.height}</span>
                </summary>
                <div class="settings-row-body">
                    <div class="settings-number-grid">
                        <label class="settings-field">
                            <span>默认宽度</span>
                            <input type="number" min="${CARD_MIN_WIDTH}" step="1" data-role="width" value="${size.width}">
                        </label>
                        <label class="settings-field">
                            <span>默认高度</span>
                            <input type="number" min="${CARD_MIN_HEIGHT}" step="1" data-role="height" value="${size.height}">
                        </label>
                    </div>
                    <div class="settings-actions">
                        <button class="mini-btn" type="button" data-action="save-tool-size">保存</button>
                        <button class="mini-btn" type="button" data-action="reset-tool-size">恢复默认值</button>
                        <button class="mini-btn" type="button" data-action="toggle-apply-targets">应用于其他</button>
                    </div>
                    <div class="apply-targets" data-role="apply-targets">
                        <div class="apply-targets-list">
                            ${otherTools.map((item) => `<label class="inline-check">
                                <input type="checkbox" value="${escapeHTML(item.id)}">
                                <span>${escapeHTML(item.icon)} ${escapeHTML(item.name)}</span>
                            </label>`).join("")}
                        </div>
                        <button class="action-btn" type="button" data-action="apply-to-selected">应用到选中工具</button>
                    </div>
                </div>
            </details>`;
        }).join("");
    }

    function openSettings() {
        renderCardSettings();
        settingsModal.classList.add("show");
    }

    function closeSettingsModal() {
        settingsModal.classList.remove("show");
    }

    applyCardCssVariables();
    setCanvasMenuMode("canvas");

    function setCanvasActive() {
        document.body.classList.add("canvas-active");
    }

    function getStagePoint(clientX, clientY) {
        const rect = cardsRoot.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function hideCanvasMenu() {
        canvasMenu.classList.remove("show");
        menuCard = null;
    }

    function setCanvasMenuMode(mode) {
        canvasMenu.querySelectorAll("[data-action]").forEach((button) => {
            const action = button.dataset.action;
            const showForCanvas = mode === "canvas" && action === "add-card";
            const showForCard = mode === "card" && ["save-card-default", "reset-card-default"].includes(action);
            button.hidden = !showForCanvas && !showForCard;
        });
    }

    function positionCanvasMenu(clientX, clientY) {
        canvasMenu.style.left = `${clientX}px`;
        canvasMenu.style.top = `${clientY}px`;
        canvasMenu.classList.add("show");

        const rect = canvasMenu.getBoundingClientRect();
        const maxLeft = window.innerWidth - rect.width - 8;
        const maxTop = window.innerHeight - rect.height - 8;
        canvasMenu.style.left = `${Math.max(8, Math.min(clientX, maxLeft))}px`;
        canvasMenu.style.top = `${Math.max(8, Math.min(clientY, maxTop))}px`;
    }

    function getHeadTooltip() {
        if (headTooltip) return headTooltip;
        headTooltip = document.createElement("div");
        headTooltip.className = "head-tooltip";
        document.body.appendChild(headTooltip);
        return headTooltip;
    }

    function hideHeadTooltip() {
        activeTooltipButton = null;
        if (headTooltip) headTooltip.classList.remove("show");
    }

    function showHeadTooltip(button) {
        const tip = button && button.dataset.tip;
        if (!tip) return;

        activeTooltipButton = button;
        const tooltip = getHeadTooltip();
        tooltip.textContent = tip;
        tooltip.classList.add("show");

        const buttonRect = button.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const left = Math.max(12, Math.min(buttonRect.left + buttonRect.width / 2 - tooltipRect.width / 2, window.innerWidth - tooltipRect.width - 12));
        const top = Math.max(12, Math.min(buttonRect.bottom + 10, window.innerHeight - tooltipRect.height - 12));
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }

    function showCanvasMenu(clientX, clientY) {
        setCanvasActive();
        menuCard = null;
        setCanvasMenuMode("canvas");
        menuPoint = getStagePoint(clientX, clientY);
        positionCanvasMenu(clientX, clientY);
    }

    function showCardMenu(card, clientX, clientY) {
        if (!card || !card.toolId) return;
        setCanvasActive();
        menuPoint = null;
        menuCard = card;
        setCanvasMenuMode("card");
        positionCanvasMenu(clientX, clientY);
    }

    function isCanvasBlank(target) {
        return !target.closest(".tool-card") && !target.closest(".canvas-menu") && !target.closest(".fixed-topbar");
    }

    function canStartCanvasPan(target) {
        return !target.closest(".canvas-menu") && !target.closest(".fixed-topbar");
    }

    function canWheelPanCanvas(target) {
        return !target.closest(".tool-card") && !target.closest(".canvas-menu") && !target.closest(".fixed-topbar");
    }

    function normalizeWheelDelta(event) {
        const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? window.innerHeight : 1;
        return {
            x: event.deltaX * unit,
            y: event.deltaY * unit
        };
    }

    class ToolCard {
        constructor(ws, id) {
            this.workspace = ws;
            this.id = id;
            this.toolId = null;
            this.cleanup = null;
            this.x = 0;
            this.y = 0;
            this.element = this.createElement();
            this.contentEl = this.element.querySelector(".card-content");
            this.resizeObserver = null;
            this.contentResizeObserver = null;
            this.contentMutationObserver = null;
            this.autoFitFrame = 0;
            this.render();
        }

        createElement() {
            const wrap = document.createElement("section");
            wrap.className = "tool-card";
            wrap.__toolCard = this;
            wrap.innerHTML = `<div class="card-content"></div>`;
            wrap.addEventListener("pointerdown", (event) => {
                if (event.button === 0) this.workspace.bringToFront(this);
            });
            return wrap;
        }

        setPosition(x, y) {
            if (!isDesktopPointer) return;
            this.x = Math.round(x);
            this.y = Math.round(y);
            this.element.style.left = `${this.x}px`;
            this.element.style.top = `${this.y}px`;
            this.workspace.updateCanvasBounds();
        }

        get width() {
            return Math.max(CARD_MIN_WIDTH, this.element.offsetWidth || DEFAULT_CARD_WIDTH);
        }

        get height() {
            return Math.max(CARD_MIN_HEIGHT, this.element.offsetHeight || DEFAULT_CARD_HEIGHT);
        }

        setSize(width, height) {
            const nextWidth = Number.isFinite(width) ? width : DEFAULT_CARD_WIDTH;
            const nextHeight = Number.isFinite(height) ? height : DEFAULT_CARD_HEIGHT;
            this.element.style.minWidth = `${CARD_MIN_WIDTH}px`;
            this.element.style.minHeight = `${CARD_MIN_HEIGHT}px`;
            this.element.style.width = `${Math.max(CARD_MIN_WIDTH, Math.round(nextWidth))}px`;
            this.element.style.height = `${Math.max(CARD_MIN_HEIGHT, Math.round(nextHeight))}px`;
            this.workspace.updateCanvasBounds();
        }

        resetToDefaultSize() {
            if (!isDesktopPointer) return;
            this.setSize(DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT);
        }

        applyToolDefaultSize(toolId) {
            const size = getToolDefaultSize(toolId);
            if (!size) return false;
            this.setSize(size.width, size.height);
            return true;
        }

        saveCurrentSizeAsToolDefault() {
            if (!this.toolId) return false;
            return setToolDefaultSize(this.toolId, this.width, this.height);
        }

        initDrag() {
            if (!isDesktopPointer) return;
            const handle = this.contentEl.querySelector(".glow-head");
            if (!handle || handle.dataset.dragReady === "true") return;
            handle.dataset.dragReady = "true";

            handle.addEventListener("pointerdown", (event) => {
                if (event.button !== 0) return;
                if (event.target.closest("button,input,select,textarea")) return;
                event.preventDefault();
                hideCanvasMenu();
                setCanvasActive();
                this.workspace.bringToFront(this);
                this.element.classList.add("dragging");
                handle.setPointerCapture(event.pointerId);

                const startX = event.clientX;
                const startY = event.clientY;
                const originX = this.x;
                const originY = this.y;

                const move = (moveEvent) => {
                    const nextX = originX + moveEvent.clientX - startX;
                    const nextY = originY + moveEvent.clientY - startY;
                    this.setPosition(nextX, nextY);
                };

                const stop = () => {
                    handle.removeEventListener("pointermove", move);
                    handle.removeEventListener("pointerup", stop);
                    handle.removeEventListener("pointercancel", stop);
                    this.element.classList.remove("dragging");
                    this.workspace.updateAllCards();
                };

                handle.addEventListener("pointermove", move);
                handle.addEventListener("pointerup", stop);
                handle.addEventListener("pointercancel", stop);
            });
        }

        observeResize() {
            if (!isDesktopPointer || this.resizeObserver) return;
            this.resizeObserver = new ResizeObserver(() => this.workspace.updateCanvasBounds());
            this.resizeObserver.observe(this.element);
        }

        stopAutoFit() {
            if (this.autoFitFrame) {
                cancelAnimationFrame(this.autoFitFrame);
                this.autoFitFrame = 0;
            }
            if (this.contentResizeObserver) {
                this.contentResizeObserver.disconnect();
                this.contentResizeObserver = null;
            }
            if (this.contentMutationObserver) {
                this.contentMutationObserver.disconnect();
                this.contentMutationObserver = null;
            }
        }

        scheduleAutoFit(allowShrink = false) {
            if (!isDesktopPointer || this.autoFitFrame) return;
            this.autoFitFrame = requestAnimationFrame(() => {
                this.autoFitFrame = 0;
                this.fitToContent(allowShrink);
            });
        }

        measureScrollerContentHeight(scroller) {
            const styles = window.getComputedStyle(scroller);
            const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;
            const bottom = Array.from(scroller.children).reduce((max, child) => {
                return Math.max(max, child.offsetTop + child.offsetHeight);
            }, 0);
            return bottom ? bottom + paddingBottom : scroller.scrollHeight;
        }

        fitToContent(allowShrink = false) {
            if (!isDesktopPointer) return;
            const scroller = this.contentEl.querySelector(".pane-body,.select-body");
            if (!scroller) return;

            const heightOverflow = scroller.scrollHeight - scroller.clientHeight;
            if (allowShrink) {
                const nextHeight = Math.max(DEFAULT_CARD_HEIGHT, this.measureScrollerContentHeight(scroller) + AUTO_FIT_PADDING);
                this.setSize(this.width, nextHeight);
                if (scroller.scrollHeight - scroller.clientHeight > 1) {
                    this.scheduleAutoFit();
                }
                return;
            }

            if (heightOverflow <= 1) return;

            this.setSize(
                this.width,
                this.height + Math.max(0, heightOverflow) + AUTO_FIT_PADDING
            );

            if (scroller.scrollHeight - scroller.clientHeight > 1) {
                this.scheduleAutoFit();
            }
        }

        observeAutoFit(scroller, allowShrinkOnStart = false) {
            if (!isDesktopPointer || !scroller) return;
            this.stopAutoFit();

            this.contentResizeObserver = new ResizeObserver(() => this.scheduleAutoFit(true));
            this.contentResizeObserver.observe(scroller);
            Array.from(scroller.children).forEach((child) => this.contentResizeObserver.observe(child));

            this.contentMutationObserver = new MutationObserver(() => {
                Array.from(scroller.children).forEach((child) => this.contentResizeObserver.observe(child));
                this.scheduleAutoFit();
            });
            this.contentMutationObserver.observe(scroller, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true
            });

            scroller.addEventListener("input", () => this.scheduleAutoFit());
            scroller.addEventListener("change", () => this.scheduleAutoFit());
            scroller.addEventListener("click", () => this.scheduleAutoFit());
            this.scheduleAutoFit(allowShrinkOnStart);
        }

        disposeTool() {
            this.stopAutoFit();
            if (typeof this.cleanup === "function") this.cleanup();
            this.cleanup = null;
        }

        render() {
            this.disposeTool();
            if (this.toolId) this.renderToolView();
            else this.renderSelectView();
            this.initDrag();
            this.observeResize();
            this.updateButtons();
        }

        renderSelectView() {
            this.resetToDefaultSize();
            const canClose = this.workspace.totalCards > 1;
            this.contentEl.innerHTML = `<div class="view-header">
                    <div class="glow-head"><span class="glow-head-title">选择文字工具</span></div>
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
                this.applyToolDefaultSize(this.toolId);
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
                        <span class="tool-head-actions" data-role="tool-head-actions"></span>
                        <button class="mini-btn" data-action="back">返回工具选择</button>
                    </div>
                    <button class="close-btn ${canClose ? "" : "hidden"}" data-action="remove" title="关闭当前卡片">×</button>
                </div>
                <div class="pane-body" data-role="tool-body"></div>`;

            const body = this.contentEl.querySelector('[data-role="tool-body"]');
            const headerActions = this.contentEl.querySelector('[data-role="tool-head-actions"]');
            this.cleanup = tool.mount(body, { showToast, shake }, { headerActions }) || null;
            this.observeAutoFit(body, true);
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

        destroy() {
            this.disposeTool();
            if (this.resizeObserver) this.resizeObserver.disconnect();
            this.element.remove();
        }
    }

    class Workspace {
        constructor(root) {
            this.root = root;
            this.cards = [];
            this.seed = 1;
            this.zSeed = 1;
            this.panX = 0;
            this.panY = 0;
        }

        get totalCards() {
            return this.cards.length;
        }

        canAdd() {
            return this.totalCards < MAX_CARDS;
        }

        limitMessage() {
            showToast("已经 99 张卡片了，你到底要把密码工厂开成多大呀！");
        }

        bringToFront(card) {
            card.element.style.zIndex = String(++this.zSeed);
        }

        addCardInstance(card, x, y) {
            this.cards.push(card);
            this.root.appendChild(card.element);
            this.bringToFront(card);
            if (isDesktopPointer) {
                card.setPosition(x, y);
            }
            this.updateAllCards();
            mobileAddBtn.disabled = !this.canAdd();
            return card;
        }

        setPan(x, y) {
            this.panX = Math.round(x);
            this.panY = Math.round(y);
            this.root.style.transform = `translate(${this.panX}px, ${this.panY}px)`;
        }

        panBy(dx, dy) {
            this.setPan(this.panX + dx, this.panY + dy);
        }

        findOpenSpot(x, y) {
            if (!isDesktopPointer) return { x: 0, y: 0 };
            return { x, y };
        }

        addCardAt(x, y) {
            if (!this.canAdd()) {
                this.limitMessage();
                return null;
            }
            const newCard = new ToolCard(this, this.seed++);
            const pos = this.findOpenSpot(x, y);
            return this.addCardInstance(newCard, pos.x, pos.y);
        }

        removeCard(cardId) {
            if (this.totalCards <= 1) {
                showToast("至少需要保留一张卡片");
                return;
            }

            const index = this.cards.findIndex((card) => card.id === cardId);
            if (index < 0) return;
            hideCanvasMenu();
            const [card] = this.cards.splice(index, 1);
            card.destroy();

            this.updateAllCards();
            mobileAddBtn.disabled = !this.canAdd();
        }

        createCardFromState(state, fallbackX, fallbackY) {
            const card = new ToolCard(this, this.seed++);
            if (state && state.toolId && TOOL_MAP[state.toolId]) {
                card.toolId = state.toolId;
                card.render();
            }
            if (state && Number.isFinite(state.width) && Number.isFinite(state.height)) {
                card.setSize(state.width, state.height);
            }
            return this.addCardInstance(
                card,
                state && Number.isFinite(state.x) ? state.x : fallbackX,
                state && Number.isFinite(state.y) ? state.y : fallbackY
            );
        }

        destroyAllCards() {
            this.cards.forEach((card) => card.destroy());
            this.cards = [];
            mobileAddBtn.disabled = false;
        }

        clearCards() {
            hideCanvasMenu();
            this.destroyAllCards();
            this.setPan(0, 0);
            this.init();
            showToast("画布已清空");
        }

        arrangeCards() {
            if (!this.cards.length) return;

            const topbar = document.querySelector(".fixed-topbar");
            const topbarBottom = topbar ? topbar.getBoundingClientRect().bottom : 0;
            const availableWidth = Math.max(CARD_MIN_WIDTH, window.innerWidth - ARRANGE_MARGIN_X * 2);
            let cursorX = 0;
            let cursorY = 0;
            let rowHeight = 0;

            this.cards.forEach((card) => {
                const width = card.width;
                const height = card.height;
                if (cursorX > 0 && cursorX + width > availableWidth) {
                    cursorX = 0;
                    cursorY += rowHeight + CARD_GAP;
                    rowHeight = 0;
                }

                card.setPosition(cursorX, cursorY);
                cursorX += width + CARD_GAP;
                rowHeight = Math.max(rowHeight, height);
            });

            this.setPan(ARRANGE_MARGIN_X, Math.ceil(topbarBottom + ARRANGE_MARGIN_TOP));
            this.updateAllCards();
            showToast("卡片已整理");
        }

        serialize() {
            return {
                panX: this.panX,
                panY: this.panY,
                cards: this.cards.map((card) => ({
                    x: card.x,
                    y: card.y,
                    width: card.width,
                    height: card.height,
                    toolId: card.toolId
                }))
            };
        }

        saveLayout() {
            try {
                window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(this.serialize()));
                showToast("当前页面设置已保存");
            } catch (_) {
                showToast("保存失败，浏览器可能限制了本地存储");
            }
        }

        loadLayout() {
            let data;
            try {
                data = JSON.parse(window.localStorage.getItem(LAYOUT_STORAGE_KEY) || "null");
            } catch (_) {
                data = null;
            }
            if (!data || !Array.isArray(data.cards) || !data.cards.length) {
                showToast("还没有可加载的页面设置");
                return;
            }

            this.destroyAllCards();
            data.cards.slice(0, MAX_CARDS).forEach((cardState, index) => {
                this.createCardFromState(cardState, index * 28, index * 28);
            });
            this.setPan(Number.isFinite(data.panX) ? data.panX : 0, Number.isFinite(data.panY) ? data.panY : 0);
            this.updateAllCards();
            showToast("已加载保存的页面设置");
        }

        updateCanvasBounds() {
            if (!isDesktopPointer) return;
            this.root.style.width = `${window.innerWidth}px`;
            this.root.style.height = `${window.innerHeight}px`;
        }

        updateAllCards() {
            for (const card of this.cards) {
                card.updateButtons();
            }
            this.updateCanvasBounds();
        }

        init() {
            const x = Math.round((window.innerWidth - DEFAULT_CARD_WIDTH) / 2);
            const y = Math.round((window.innerHeight - DEFAULT_CARD_HEIGHT) / 2 - 80);
            this.createCardFromState(null, x, y);
        }
    }

    const workspace = new Workspace(cardsRoot);

    cardsStage.addEventListener("contextmenu", (event) => {
        if (!isDesktopPointer) return;
        event.preventDefault();
        if (suppressContextMenu) {
            suppressContextMenu = false;
            return;
        }
        const cardElement = event.target.closest(".tool-card");
        if (cardElement && cardElement.__toolCard && cardElement.__toolCard.toolId) {
            showCardMenu(cardElement.__toolCard, event.clientX, event.clientY);
            return;
        }
        if (!isCanvasBlank(event.target)) return;
        showCanvasMenu(event.clientX, event.clientY);
    });

    cardsStage.addEventListener("pointerdown", (event) => {
        setCanvasActive();
        if (!event.target.closest(".canvas-menu")) {
            hideCanvasMenu();
        }
        if (!isDesktopPointer || event.button !== 2 || !canStartCanvasPan(event.target)) return;

        event.preventDefault();
        cardsStage.classList.add("panning");
        cardsStage.setPointerCapture(event.pointerId);

        const startedOnBlank = isCanvasBlank(event.target);
        let lastX = event.clientX;
        let lastY = event.clientY;
        let moved = false;

        const move = (moveEvent) => {
            const dx = moveEvent.clientX - lastX;
            const dy = moveEvent.clientY - lastY;
            if (Math.abs(moveEvent.clientX - event.clientX) > 3 || Math.abs(moveEvent.clientY - event.clientY) > 3) {
                moved = true;
            }
            workspace.panBy(dx, dy);
            lastX = moveEvent.clientX;
            lastY = moveEvent.clientY;
        };

        const stop = (upEvent) => {
            cardsStage.removeEventListener("pointermove", move);
            cardsStage.removeEventListener("pointerup", stop);
            cardsStage.removeEventListener("pointercancel", stop);
            cardsStage.classList.remove("panning");
            if (moved) {
                suppressContextMenu = true;
            } else if (startedOnBlank) {
                showCanvasMenu(upEvent.clientX, upEvent.clientY);
                suppressContextMenu = true;
            }
        };

        cardsStage.addEventListener("pointermove", move);
        cardsStage.addEventListener("pointerup", stop);
        cardsStage.addEventListener("pointercancel", stop);
    });

    cardsStage.addEventListener("wheel", (event) => {
        if (!isDesktopPointer || !canWheelPanCanvas(event.target)) return;
        event.preventDefault();
        hideCanvasMenu();
        hideHeadTooltip();
        setCanvasActive();

        const delta = normalizeWheelDelta(event);
        workspace.panBy(-delta.x, -delta.y);
    }, { passive: false });

    window.addEventListener("resize", () => workspace.updateCanvasBounds());
    window.addEventListener("scroll", hideHeadTooltip, true);

    document.addEventListener("pointerover", (event) => {
        const button = event.target.closest(".head-help");
        if (!button || activeTooltipButton === button) return;
        showHeadTooltip(button);
    });

    document.addEventListener("pointerout", (event) => {
        const button = event.target.closest(".head-help");
        if (!button || button.contains(event.relatedTarget)) return;
        hideHeadTooltip();
    });

    document.addEventListener("focusin", (event) => {
        const button = event.target.closest(".head-help");
        if (button) showHeadTooltip(button);
    });

    document.addEventListener("focusout", (event) => {
        if (event.target.closest(".head-help")) hideHeadTooltip();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            hideCanvasMenu();
            hideHeadTooltip();
            closeSettingsModal();
        }
    });

    settingsBtn.addEventListener("click", openSettings);
    closeSettings.addEventListener("click", closeSettingsModal);
    settingsModal.addEventListener("click", (event) => {
        if (event.target === settingsModal) closeSettingsModal();
    });
    resetAllSettingsBtn.addEventListener("click", () => {
        if (!clearAllToolDefaultSizes()) return;
        renderCardSettings();
        showToast("所有功能卡片默认尺寸已恢复");
    });

    cardSettingsList.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const row = button.closest(".settings-row");
        const toolId = row && row.dataset.tool;
        if (!toolId) return;

        const widthInput = row.querySelector('[data-role="width"]');
        const heightInput = row.querySelector('[data-role="height"]');
        const action = button.dataset.action;

        if (action === "save-tool-size") {
            if (setToolDefaultSize(toolId, Number(widthInput.value), Number(heightInput.value))) {
                renderCardSettings();
                showToast("默认尺寸已保存");
            }
        } else if (action === "reset-tool-size") {
            clearToolDefaultSize(toolId);
            renderCardSettings();
            showToast("此工具已恢复默认尺寸");
        } else if (action === "toggle-apply-targets") {
            row.querySelector('[data-role="apply-targets"]').classList.toggle("show");
        } else if (action === "apply-to-selected") {
            const size = normalizeSize(Number(widthInput.value), Number(heightInput.value));
            const targets = Array.from(row.querySelectorAll('[data-role="apply-targets"] input:checked')).map((item) => item.value);
            if (!targets.length) {
                showToast("请先选择要应用的工具");
                return;
            }
            targets.forEach((targetId) => setToolDefaultSize(targetId, size.width, size.height));
            renderCardSettings();
            showToast("已应用到选中工具");
        }
    });

    canvasMenu.querySelector('[data-action="add-card"]').addEventListener("click", () => {
        const point = menuPoint || getStagePoint(window.innerWidth / 2, window.innerHeight / 2);
        workspace.addCardAt(point.x, point.y);
        hideCanvasMenu();
    });

    canvasMenu.querySelector('[data-action="save-card-default"]').addEventListener("click", () => {
        if (!menuCard || !menuCard.toolId) return;
        if (menuCard.saveCurrentSizeAsToolDefault()) {
            showToast("已保存为此工具默认格式");
        }
        hideCanvasMenu();
    });

    canvasMenu.querySelector('[data-action="reset-card-default"]').addEventListener("click", () => {
        if (!menuCard || !menuCard.toolId) return;
        clearToolDefaultSize(menuCard.toolId);
        showToast("此工具默认格式已恢复");
        hideCanvasMenu();
    });

    clearCardsBtn.addEventListener("click", () => workspace.clearCards());
    arrangeCardsBtn.addEventListener("click", () => workspace.arrangeCards());
    saveLayoutBtn.addEventListener("click", () => workspace.saveLayout());
    loadLayoutBtn.addEventListener("click", () => workspace.loadLayout());

    mobileAddBtn.addEventListener("click", () => {
        if (!workspace.canAdd()) {
            workspace.limitMessage();
            return;
        }

        setCanvasActive();
        const lastCard = workspace.cards[workspace.cards.length - 1] || null;
        const x = lastCard ? lastCard.x : 0;
        const y = lastCard ? lastCard.y + lastCard.height + CARD_GAP : 0;
        workspace.addCardAt(x, y);
    });

    workspace.init();
})();
