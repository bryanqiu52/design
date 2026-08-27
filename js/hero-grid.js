// Hero Grid Canvas
// 静态网格渲染：保留 hero 原网格密度(72px)与线宽(1px)。
// 已移除鼠标悬停点亮（pointermove 阻尼跟随）与点击扩散脉冲等交互。
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
            lineWidth: 1,            // 线宽（与 hero 原样式一致）
            baseColor: 'rgba(255,255,255,0.06)' // 基础网格线（原 --card-border）
        };

        let cols = 0, rows = 0, offX = 0, offY = 0, w = 0, h = 0;

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
        };

        const draw = (now) => {
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

            requestAnimationFrame(draw);
        };

        rebuild();
        window.addEventListener('resize', rebuild);
        if (window.ResizeObserver) {
            new ResizeObserver(rebuild).observe(canvas.parentElement);
        }
        requestAnimationFrame(draw);
    }
})();
