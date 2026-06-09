(function () {
    const DIRECTIONS = [
        { key: "9", label: "右上", angle: -45 },
        { key: "6", label: "右", angle: 0 },
        { key: "3", label: "右下", angle: 45 },
        { key: "2", label: "下", angle: 90 },
        { key: "1", label: "左下", angle: 135 },
        { key: "4", label: "左", angle: 180 },
        { key: "7", label: "左上", angle: 225 },
        { key: "8", label: "上", angle: 270 }
    ];

    const LETTER_PAIRS = {
        A: ["2", "1"],
        B: ["2", "4"],
        C: ["2", "7"],
        D: ["2", "8"],
        E: ["9", "2"],
        F: ["6", "2"],
        G: ["3", "2"],
        H: ["1", "4"],
        I: ["1", "7"],
        K: ["1", "8"],
        L: ["9", "1"],
        M: ["6", "1"],
        N: ["3", "1"],
        O: ["4", "7"],
        P: ["4", "8"],
        Q: ["9", "4"],
        R: ["6", "4"],
        S: ["3", "4"],
        T: ["7", "8"],
        U: ["9", "7"],
        Y: ["6", "7"],
        J: ["6", "8"],
        V: ["8", "3"],
        W: ["9", "6"],
        X: ["9", "3"],
        Z: ["6", "3"]
    };

    const PAIR_TO_LETTER = Object.fromEntries(
        Object.entries(LETTER_PAIRS).map(([letter, pair]) => [pair.slice().sort((a, b) => a - b).join("-"), letter])
    );

    function normAngle(a) {
        return ((a % 360) + 360) % 360;
    }

    function snapAngle(angle) {
        return Math.round(angle / 45) * 45;
    }

    function angleToKey(angle) {
        const a = normAngle(angle);
        const dir = DIRECTIONS.find(d => normAngle(d.angle) === a);
        return dir ? dir.key : null;
    }

    function keyToAngle(key) {
        const dir = DIRECTIONS.find(d => d.key === key);
        return dir ? dir.angle : null;
    }

    function mountSemaphore(container, helpers, options = {}) {
        const headerActions = options.headerActions || null;
        if (headerActions) {
            headerActions.innerHTML = `<button class="head-help" type="button" data-tip="拖动两根指针组成旗语字母。长针(蓝)优先。Backspace 删除上一字母，Delete 清空输出。">❓</button>`;
        }

        let outputValue = "";
        let cleanupKeyboard = null;
        let angles = [135, 180];
        let dragging = null;
        let snapping = [false, false];
        let keyboardTarget = 0;

        container.innerHTML = `<div class="stack">
            <div class="semaphore-input">
                <div class="semaphore-wheel" aria-label="旗语方向选择">
                    ${DIRECTIONS.map((d) => `<button class="semaphore-ray" type="button" data-key="${d.key}" style="--angle:${d.angle}deg" title="${d.key} ${d.label}" aria-label="${d.key} ${d.label}"></button>`).join("")}
                    <div class="semaphore-pointer long" data-index="0" data-role="pointer"></div>
                    <div class="semaphore-pointer short" data-index="1" data-role="pointer"></div>
                    <div class="semaphore-center-label" data-role="center-label">-</div>
                </div>
                <div class="semaphore-preview">
                    <div class="semaphore-combo" data-role="combo">等待输入</div>
                    <div class="semaphore-letter" data-role="letter">-</div>
                </div>
            </div>
            <textarea class="text-output" data-role="output" readonly placeholder="按 Enter 将有效字母写入这里"></textarea>
        </div>`;

        const pointers = Array.from(container.querySelectorAll(".semaphore-pointer"));
        const rays = Array.from(container.querySelectorAll(".semaphore-ray"));
        const comboEl = container.querySelector('[data-role="combo"]');
        const letterEl = container.querySelector('[data-role="letter"]');
        const centerLabel = container.querySelector('[data-role="center-label"]');
        const output = container.querySelector('[data-role="output"]');
        const wheel = container.querySelector(".semaphore-wheel");

        function currentLetter() {
            const keys = angles.map(angleToKey);
            if (keys.some(k => !k)) return "";
            return PAIR_TO_LETTER[keys.slice().sort().join("-")] || "";
        }

        function selectedKeys() {
            return angles.map(angleToKey).filter(Boolean);
        }

        function renderPointer(ptr, i) {
            ptr.style.setProperty('--angle', angles[i] + 'deg');
        }

        function render() {
            pointers.forEach((ptr, i) => renderPointer(ptr, i));
            const keys = selectedKeys();
            const letter = currentLetter();
            comboEl.textContent = keys.length === 2 ? keys.join(' + ') : "等待输入";
            comboEl.classList.toggle("semaphore-muted", keys.length !== 2);
            letterEl.textContent = letter || (keys.length === 2 ? "?" : "-");
            letterEl.classList.toggle("semaphore-muted", !letter);
            output.value = outputValue;
        }

        function updateTargetGlow(angle, ptrIdx) {
            const snapped = snapAngle(angle);
            rays.forEach(ray => {
                const rayAngle = parseFloat(ray.style.getPropertyValue('--angle'));
                const isTarget = normAngle(rayAngle) === normAngle(snapped);
                const otherAngle = angles[1 - ptrIdx];
                const otherSnapped = normAngle(snapAngle(otherAngle));
                const isOther = normAngle(rayAngle) === otherSnapped;
                ray.classList.toggle("active", isTarget);
                ray.classList.toggle("overlap", isTarget && isOther);
            });
        }

        function clearTargetGlow() {
            rays.forEach(ray => {
                ray.classList.remove("active", "overlap");
            });
        }

        function animateSnap(index, targetAngle) {
            snapping[index] = true;
            const ptr = pointers[index];
            ptr.classList.add("snapping");
            angles[index] = targetAngle;
            ptr.style.setProperty('--angle', targetAngle + 'deg');
            setTimeout(() => {
                ptr.classList.remove("snapping");
                snapping[index] = false;
                render();
            }, 320);
        }

        function startDrag(e, index) {
            if (snapping.some(s => s)) return;
            e.preventDefault();
            dragging = index;
            pointers[index].classList.add("dragging");
            document.addEventListener("pointermove", moveDrag);
            document.addEventListener("pointerup", endDrag);
            document.addEventListener("pointercancel", endDrag);
        }

        function moveDrag(e) {
            if (dragging === null) return;
            const rect = wheel.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const rawAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
            const prev = angles[dragging];
            let delta = rawAngle - prev;
            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;
            angles[dragging] = prev + delta;
            pointers[dragging].style.setProperty('--angle', angles[dragging] + 'deg');
            updateTargetGlow(angles[dragging], dragging);
            const snapped = snapAngle(angles[dragging]);
            const key = angleToKey(snapped);
            centerLabel.textContent = key || "-";
            centerLabel.classList.add("active");
        }

        function endDrag(e) {
            if (dragging === null) return;
            const ptr = pointers[dragging];
            ptr.classList.remove("dragging");
            const snapped = snapAngle(angles[dragging]);
            clearTargetGlow();
            centerLabel.textContent = "-";
            centerLabel.classList.remove("active");
            animateSnap(dragging, snapped);
            dragging = null;
            document.removeEventListener("pointermove", moveDrag);
            document.removeEventListener("pointerup", endDrag);
            document.removeEventListener("pointercancel", endDrag);
        }

        pointers.forEach((ptr, i) => {
            ptr.addEventListener("pointerdown", e => startDrag(e, i));
        });

        function snapPointerToKey(index, key) {
            const angle = keyToAngle(key);
            if (angle === null) return;
            animateSnap(index, angle);
        }

        function handleKeyPress(key) {
            if (key === "5") return;
            // 立即转动，不受动画阻塞
            const idx = keyboardTarget;
            keyboardTarget = 1 - keyboardTarget;
            snapPointerToKey(idx, key);
        }

        function commit() {
            const letter = currentLetter();
            if (!letter) return;
            outputValue += letter;
            render();
        }

        function backspace() {
            if (!outputValue) return;
            outputValue = outputValue.slice(0, -1);
            render();
        }

        function clearOutput() {
            outputValue = "";
            angles = [135, 180];
            keyboardTarget = 0;
            render();
        }

        const onKeyDown = (event) => {
            const card = container.closest(".tool-card");
            const isActiveCard = card && (card.matches(":hover") || card.contains(document.activeElement));
            if (!isActiveCard) return;

            if (/^[1-9]$/.test(event.key) && event.key !== "5") {
                event.preventDefault();
                handleKeyPress(event.key);
            } else if (event.key === "Enter") {
                event.preventDefault();
                commit();
            } else if (event.key === "Delete") {
                event.preventDefault();
                clearOutput();
            } else if (event.key === "Backspace") {
                event.preventDefault();
                backspace();
            }
        };

        document.addEventListener("keydown", onKeyDown);
        cleanupKeyboard = () => document.removeEventListener("keydown", onKeyDown);
        render();

        return () => {
            if (cleanupKeyboard) cleanupKeyboard();
            if (headerActions) headerActions.innerHTML = "";
        };
    }

    window.FixedToolRegistry.register({
        id: "semaphore",
        name: "旗语密码",
        icon: "🚩",
        desc: "双旗方向组合成字母。",
        tags: ["旗语", "semaphore", "flag", "信号旗", "方向", "qiyu", "qiyimima"],
        mount: mountSemaphore
    });
})();