// Hero Grid Canvas
// 参考实现：格子点亮 + 阻尼跟随 + 保持后缓慢淡出 + 点击扩散脉冲
// 保留 hero 原网格密度(72px)与线宽(1px)，颜色使用网站主题色 #c6f432
(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        const canvas = document.getElementById('hero-grid');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        const CFG = {
            cellSize: 72,            // 网格密度（与 hero 原样式一致）
            lineWidth: 1,            // 线宽（与 hero 原样式一致，点亮线同宽）
            color: '#c6f432',        // 网站主题色
            radius: 200,             // 鼠标点亮半径
            holdTime: 300,           // 点亮后保持时长(ms)
            fadeDuration: 350,       // 淡出时长(ms)（更快消失）
            maxOpacity: 0.3,        // 点亮最高透明度（低调，不抢眼）
            damp: 0.4,              // 阻尼跟随系数
            clickPulse: true,        // 点击扩散脉冲
            pulseSpeed: 3000,        // 脉冲扩散速度(px/s)（更快扫动）
            baseColor: 'rgba(255,255,255,0.06)' // 基础网格线（原 --card-border）
        };

        let cols = 0, rows = 0, offX = 0, offY = 0, w = 0, h = 0;
        let alphas = new Float32Array(0);   // 每个格子的点亮强度
        let touched = new Float64Array(0);  // 每个格子最近被点亮的时刻
        const pulses = [];                  // 点击脉冲列表

        const hexToRgb = (hex) => {
            const v = hex.replace('#', '');
            const num = parseInt(v.length === 3 ? v.split('').map((c) => c + c).join('') : v, 16);
            return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
        };
        const lerp = (a, b, t) => a + (b - a) * t;
        const falloff = (t) => t * t * (3 - 2 * t); // smoothstep

        // 重建网格（尺寸变化时调用）
        const rebuild = () => {
            w = canvas.clientWidth;
            h = canvas.clientHeight;
            canvas.width = Math.max(1, Math.round(w * dpr));
            canvas.height = Math.max(1, Math.round(h * dpr));
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            cols = Math.ceil(w / CFG.cellSize) + 1;
            rows = Math.ceil(h / CFG.cellSize) + 1;
            offX = (w - cols * CFG.cellSize) / 2;
            offY = (h - rows * CFG.cellSize) / 2;
            alphas = new Float32Array(cols * rows);
            touched = new Float64Array(cols * rows);
        };

        // 第 i 个格子的中心点
        const cellCenter = (i) => [
            offX + (i % cols) * CFG.cellSize + CFG.cellSize / 2,
            offY + Math.floor(i / cols) * CFG.cellSize + CFG.cellSize / 2
        ];

        // 点亮鼠标(或脉冲)附近 radius 内的格子
        const energize = (x, y, boost) => {
            const now = performance.now();
            const minCol = Math.max(0, Math.floor((x - CFG.radius - offX) / CFG.cellSize));
            const maxCol = Math.min(cols - 1, Math.floor((x + CFG.radius - offX) / CFG.cellSize));
            const minRow = Math.max(0, Math.floor((y - CFG.radius - offY) / CFG.cellSize));
            const maxRow = Math.min(rows - 1, Math.floor((y + CFG.radius - offY) / CFG.cellSize));
            for (let cr = minRow; cr <= maxRow; cr++) {
                for (let cc = minCol; cc <= maxCol; cc++) {
                    const i = cr * cols + cc;
                    const [cx, cy] = cellCenter(i);
                    const dist = Math.hypot(cx - x, cy - y);
                    if (dist > CFG.radius) continue;
                    const level = falloff(1 - dist / CFG.radius) * CFG.maxOpacity * (boost ?? 1);
                    if (level > alphas[i]) { alphas[i] = level; touched[i] = now; }
                    else if (level > 0) touched[i] = now;
                }
            }
        };

        let mx = -9999, my = -9999, mtx = -9999, mty = -9999;
        // 事件绑定到整个 hero 区域，避免内容层遮挡 canvas 导致收不到事件
        const heroSection = canvas.closest('.hero');
        const target = heroSection || canvas;

        target.addEventListener('pointermove', (e) => {
            const r = canvas.getBoundingClientRect();
            mtx = e.clientX - r.left;
            mty = e.clientY - r.top;
        });
        target.addEventListener('pointerleave', () => { mtx = -9999; mty = -9999; });
        target.addEventListener('pointerdown', (e) => {
            if (!CFG.clickPulse) return;
            const r = canvas.getBoundingClientRect();
            pulses.push({ x: e.clientX - r.left, y: e.clientY - r.top, t0: performance.now() });
        });

        let lastFrame = 0;
        const draw = (now) => {
            const dt = Math.min(now - lastFrame, 50);
            lastFrame = now;
            ctx.clearRect(0, 0, w, h);

            // 1. 基础网格（保持 hero 原样：72px、1px、低透明度白线）
            ctx.strokeStyle = CFG.baseColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let c = 0; c <= cols; c++) {
                const x = offX + c * CFG.cellSize;
                ctx.moveTo(x, 0); ctx.lineTo(x, h);
            }
            for (let r = 0; r <= rows; r++) {
                const y = offY + r * CFG.cellSize;
                ctx.moveTo(0, y); ctx.lineTo(w, y);
            }
            ctx.stroke();

            // 2. 阻尼跟随：鼠标真实位置(mt)以 0.22 系数平滑逼近当前(m)
            mx = lerp(mx, mtx, CFG.damp);
            my = lerp(my, mty, CFG.damp);
            if (mtx > -9990) energize(mx, my);

            // 3. 点击扩散脉冲：圆环经过的格子被点亮
            for (let pi = pulses.length - 1; pi >= 0; pi--) {
                const p = pulses[pi];
                const age = (now - p.t0) / 1000;
                const ringR = age * CFG.pulseSpeed;
                if (ringR > Math.hypot(w, h)) { pulses.splice(pi, 1); continue; }
                const band = CFG.cellSize;
                for (let cr = 0; cr < rows; cr++) {
                    for (let cc = 0; cc < cols; cc++) {
                        const i = cr * cols + cc;
                        const [cx, cy] = cellCenter(i);
                        const dist = Math.hypot(cx - p.x, cy - p.y);
                        if (Math.abs(dist - ringR) < band / 2 && CFG.maxOpacity > alphas[i]) {
                            alphas[i] = CFG.maxOpacity;
                            touched[i] = now;
                        }
                    }
                }
            }

            // 4. 点亮效果：沿网格线分段绘制（与默认网格线严格同宽 1px，
            //    每条线每段只画一次，避免相邻格子共享边重复叠加导致显粗）
            const [cr, cg, cb] = hexToRgb(CFG.color);
            const fadeStep = dt / CFG.fadeDuration;
            // 先衰减 alpha
            for (let i = 0; i < alphas.length; i++) {
                let a = alphas[i];
                if (a <= 0) continue;
                if (now - touched[i] > CFG.holdTime) {
                    a = Math.max(0, a - fadeStep);
                    alphas[i] = a;
                }
            }
            ctx.lineWidth = CFG.lineWidth;

            // 竖线：第 c 条竖线的第 r 段亮度 = 相邻四个格子中最大的 alpha
            for (let c = 0; c <= cols; c++) {
                const x = offX + c * CFG.cellSize;
                let segY = 0, curA = 0;
                for (let r = 0; r <= rows; r++) {
                    const y = offY + r * CFG.cellSize;
                    let a = 0;
                    if (c > 0 && r > 0) a = Math.max(a, alphas[(r - 1) * cols + (c - 1)]);
                    if (c > 0 && r < rows) a = Math.max(a, alphas[r * cols + (c - 1)]);
                    if (c < cols && r > 0) a = Math.max(a, alphas[(r - 1) * cols + c]);
                    if (c < cols && r < rows) a = Math.max(a, alphas[r * cols + c]);
                    if (a !== curA) {
                        if (curA > 0) {
                            ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + curA.toFixed(3) + ')';
                            ctx.beginPath();
                            ctx.moveTo(x, segY);
                            ctx.lineTo(x, y);
                            ctx.stroke();
                        }
                        curA = a;
                        segY = y;
                    }
                }
                if (curA > 0) {
                    ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + curA.toFixed(3) + ')';
                    ctx.beginPath();
                    ctx.moveTo(x, segY);
                    ctx.lineTo(x, offY + rows * CFG.cellSize);
                    ctx.stroke();
                }
            }

            // 横线：第 r 条横线的第 c 段亮度 = 相邻四个格子中最大的 alpha
            for (let r = 0; r <= rows; r++) {
                const y = offY + r * CFG.cellSize;
                let segX = 0, curA = 0;
                for (let c = 0; c <= cols; c++) {
                    const x = offX + c * CFG.cellSize;
                    let a = 0;
                    if (r > 0 && c > 0) a = Math.max(a, alphas[(r - 1) * cols + (c - 1)]);
                    if (r > 0 && c < cols) a = Math.max(a, alphas[(r - 1) * cols + c]);
                    if (r < rows && c > 0) a = Math.max(a, alphas[r * cols + (c - 1)]);
                    if (r < rows && c < cols) a = Math.max(a, alphas[r * cols + c]);
                    if (a !== curA) {
                        if (curA > 0) {
                            ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + curA.toFixed(3) + ')';
                            ctx.beginPath();
                            ctx.moveTo(segX, y);
                            ctx.lineTo(x, y);
                            ctx.stroke();
                        }
                        curA = a;
                        segX = x;
                    }
                }
                if (curA > 0) {
                    ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + curA.toFixed(3) + ')';
                    ctx.beginPath();
                    ctx.moveTo(segX, y);
                    ctx.lineTo(offX + cols * CFG.cellSize, y);
                    ctx.stroke();
                }
            }
            requestAnimationFrame(draw);
        };

        rebuild();
        window.addEventListener('resize', rebuild);
        if (window.ResizeObserver) {
            new ResizeObserver(rebuild).observe(canvas.parentElement);
        }
        requestAnimationFrame((t) => { lastFrame = t; requestAnimationFrame(draw); });
    }
})();
