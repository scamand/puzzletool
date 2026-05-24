(function () {
    const SECRET_PHRASE = "We need to go deeper!";
    const CONFIG = (window.TextToolsConfig && window.TextToolsConfig.ocr) || {};
    const STORAGE = (window.TextToolsConfig && window.TextToolsConfig.storage) || {};
    const TESSERACT_URL = CONFIG.tesseractScriptUrl;
    const TESSERACT_LANG = CONFIG.tesseractLang || "eng";
    const PADDLE_JOB_URL = CONFIG.paddleJobUrl;
    const PADDLE_MODEL = CONFIG.paddleModel;
    const PADDLE_TOKEN_KEY = STORAGE.paddleOcrToken || "fixed_cipher_paddle_ocr_token_v1";
    const POLL_INTERVAL = CONFIG.paddlePollIntervalMs || 5000;

    let tesseractPromise = null;

    function loadTesseract() {
        if (window.Tesseract) return Promise.resolve(window.Tesseract);
        if (tesseractPromise) return tesseractPromise;
        tesseractPromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = TESSERACT_URL;
            script.async = true;
            script.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error("Tesseract.js 加载失败"));
            script.onerror = () => reject(new Error("Tesseract.js 加载失败，请检查网络"));
            document.head.appendChild(script);
        });
        return tesseractPromise;
    }

    function readStoredToken() {
        try {
            return window.localStorage.getItem(PADDLE_TOKEN_KEY) || "";
        } catch (_) {
            return "";
        }
    }

    function storeToken(token) {
        try {
            window.localStorage.setItem(PADDLE_TOKEN_KEY, token);
            return true;
        } catch (_) {
            return false;
        }
    }

    function promptForToken() {
        const token = window.prompt("请输入 OCR Token");
        if (!token || !token.trim()) return "";
        const trimmed = token.trim();
        storeToken(trimmed);
        return trimmed;
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("图片读取失败"));
            reader.readAsDataURL(file);
        });
    }

    function dataUrlToFile(dataUrl, name) {
        const [meta, payload] = dataUrl.split(",");
        const mime = (meta.match(/^data:(.*?);base64$/) || [])[1] || "image/png";
        const binary = atob(payload);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new File([bytes], name, { type: mime });
    }

    function extractPaddleText(jsonlText) {
        return jsonlText
            .trim()
            .split("\n")
            .filter(Boolean)
            .flatMap((line) => {
                const item = JSON.parse(line);
                const results = item.result && item.result.layoutParsingResults;
                if (!Array.isArray(results)) return [];
                return results.map((result) => result.markdown && result.markdown.text).filter(Boolean);
            })
            .join("\n\n")
            .trim();
    }

    async function submitPaddleJob(file, token) {
        const form = new FormData();
        form.append("model", PADDLE_MODEL);
        form.append("optionalPayload", JSON.stringify({
            useDocOrientationClassify: false,
            useDocUnwarping: false,
            useChartRecognition: false
        }));
        form.append("file", file);

        const response = await fetch(PADDLE_JOB_URL, {
            method: "POST",
            headers: { Authorization: `bearer ${token}` },
            body: form
        });
        if (response.status === 429) throw new Error("在线识别今日额度已用尽");
        if (!response.ok) throw new Error(`在线识别提交失败：${response.status}`);
        const data = await response.json();
        const jobId = data && data.data && data.data.jobId;
        if (!jobId) throw new Error("在线识别未返回任务编号");
        return jobId;
    }

    async function pollPaddleJob(jobId, token, setStatus) {
        while (true) {
            const response = await fetch(`${PADDLE_JOB_URL}/${jobId}`, {
                headers: { Authorization: `bearer ${token}` }
            });
            if (!response.ok) throw new Error(`在线识别查询失败：${response.status}`);
            const data = await response.json();
            const info = data && data.data;
            const state = info && info.state;
            if (state === "done") {
                const jsonUrl = info.resultUrl && info.resultUrl.jsonUrl;
                if (!jsonUrl) throw new Error("在线识别未返回结果地址");
                return jsonUrl;
            }
            if (state === "failed") throw new Error(info.errorMsg || "在线识别失败");
            if (state === "running" && info.extractProgress) {
                setStatus(`在线识别中：${info.extractProgress.extractedPages || 0}/${info.extractProgress.totalPages || "?"}`);
            } else {
                setStatus(`在线识别状态：${state || "等待中"}`);
            }
            await sleep(POLL_INTERVAL);
        }
    }

    async function fetchPaddleResult(jsonUrl) {
        const response = await fetch(jsonUrl);
        if (!response.ok) throw new Error(`在线识别结果下载失败：${response.status}`);
        return extractPaddleText(await response.text());
    }

    function mountOcr(container, helpers, options = {}) {
        const headerActions = options.headerActions || null;
        if (headerActions) {
            headerActions.innerHTML = `<button class="head-help" type="button" data-tip="可粘贴剪贴板图片或选择图片文件。默认使用 Tesseract.js 在浏览器本地识别。">❓</button>`;
        }

        let imageDataUrl = "";
        let imageFile = null;
        let paddleMode = false;
        let disposed = false;

        container.innerHTML = `<div class="stack ocr-tool">
            <textarea class="text-input ocr-command" data-role="command" placeholder="在这里按 Ctrl+V 粘贴图片，或选择图片文件"></textarea>
            <div class="controls-row">
                <input class="text-input compact-input ocr-file" data-role="file" type="file" accept="image/*">
                <button class="action-btn" data-action="recognize">本地识别</button>
                <button class="action-btn" data-action="paddle-recognize" hidden>在线识别</button>
                <button class="action-btn warn" data-action="clear">清空</button>
            </div>
            <div class="ocr-preview" data-role="preview">
                <span>等待粘贴图片</span>
            </div>
            <div class="panel-note ocr-status" data-role="status">本地识别会下载 Tesseract.js 与语言数据，首次使用需要等待。</div>
            <textarea class="text-output" data-role="output" readonly placeholder="识别文本会显示在这里"></textarea>
        </div>`;

        const command = container.querySelector('[data-role="command"]');
        const fileInput = container.querySelector('[data-role="file"]');
        const preview = container.querySelector('[data-role="preview"]');
        const status = container.querySelector('[data-role="status"]');
        const output = container.querySelector('[data-role="output"]');
        const paddleButton = container.querySelector('[data-action="paddle-recognize"]');
        const card = container.closest(".tool-card");
        const title = card && card.querySelector(".glow-head-title");

        function setStatus(message) {
            status.textContent = message;
        }

        function setImage(dataUrl, file) {
            imageDataUrl = dataUrl;
            imageFile = file || dataUrlToFile(dataUrl, "clipboard.png");
            preview.innerHTML = `<img src="${dataUrl}" alt="待识别图片">`;
            setStatus("图片已载入，可以开始识别。");
        }

        function requireImage() {
            if (imageDataUrl) return true;
            helpers.showToast("请先粘贴或选择图片");
            helpers.shake(command);
            return false;
        }

        function activatePaddleMode() {
            const token = readStoredToken() || promptForToken();
            if (!token) {
                helpers.showToast("未填写 Token");
                return;
            }
            paddleMode = true;
            paddleButton.hidden = false;
            if (title) title.classList.add("ocr-paddle-title");
            setStatus("在线识别已开启。");
        }

        async function recognizeLocal() {
            if (!requireImage()) return;
            try {
                setStatus("正在加载 Tesseract.js...");
                const Tesseract = await loadTesseract();
                setStatus("正在本地识别...");
                const result = await Tesseract.recognize(imageDataUrl, TESSERACT_LANG, {
                    logger(info) {
                        if (disposed || !info || !info.status) return;
                        const progress = Number.isFinite(info.progress) ? ` ${Math.round(info.progress * 100)}%` : "";
                        setStatus(`${info.status}${progress}`);
                    }
                });
                output.value = result.data.text.trim();
                setStatus("本地识别完成。");
            } catch (error) {
                setStatus(error.message || "本地识别失败");
                helpers.showToast("本地识别失败");
            }
        }

        async function recognizePaddle() {
            if (!requireImage()) return;
            const token = readStoredToken();
            if (!token) {
                helpers.showToast("请先在设置中填写 Token");
                return;
            }
            try {
                setStatus("正在提交在线识别任务...");
                const jobId = await submitPaddleJob(imageFile, token);
                const jsonUrl = await pollPaddleJob(jobId, token, setStatus);
                setStatus("正在下载识别结果...");
                output.value = await fetchPaddleResult(jsonUrl);
                setStatus("在线识别完成。");
            } catch (error) {
                setStatus(`${error.message || "在线识别失败"}。如果是浏览器跨域限制，需要以后改成后端代理。`);
                helpers.showToast("在线识别失败");
            }
        }

        command.addEventListener("paste", async (event) => {
            const item = Array.from(event.clipboardData && event.clipboardData.items || []).find((entry) => entry.type.startsWith("image/"));
            if (!item) return;
            event.preventDefault();
            const file = item.getAsFile();
            setImage(await fileToDataUrl(file), file);
        });

        command.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" || event.shiftKey) return;
            if (command.value.trim() !== SECRET_PHRASE) return;
            if (document.querySelectorAll(".tool-card").length !== 1) return;
            event.preventDefault();
            command.value = "";
            activatePaddleMode();
        });

        fileInput.addEventListener("change", async () => {
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            setImage(await fileToDataUrl(file), file);
        });

        container.querySelector('[data-action="recognize"]').addEventListener("click", recognizeLocal);
        container.querySelector('[data-action="paddle-recognize"]').addEventListener("click", recognizePaddle);
        container.querySelector('[data-action="clear"]').addEventListener("click", () => {
            imageDataUrl = "";
            imageFile = null;
            output.value = "";
            command.value = "";
            fileInput.value = "";
            preview.innerHTML = "<span>等待粘贴图片</span>";
            setStatus(paddleMode ? "在线识别已开启。" : "本地识别会下载 Tesseract.js 与语言数据，首次使用需要等待。");
            command.focus();
        });

        return () => {
            disposed = true;
            if (title) title.classList.remove("ocr-paddle-title");
            if (headerActions) headerActions.innerHTML = "";
        };
    }

    window.FixedToolRegistry.register({
        id: "ocr",
        name: "文字OCR",
        icon: "👁️",
        desc: "粘贴图片并识别文字。",
        tags: ["ocr", "文字识别", "图片识别", "tesseract", "paddleocr", "wenzi", "shibie"],
        mount: mountOcr
    });
})();
