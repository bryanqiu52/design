(function () {
    const CFG = { sparkSize: 11, sparkRadius: 18, sparkCount: 8, duration: 420 };
    const easeOut = (t) => t * (2 - t);

    // 判断是否为站内页面链接（需要跨页传递点击位置的导航）
    function isPageNav(e, link) {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return false;
        if (link.target === '_blank') return false;
        const href = link.getAttribute('href') || '';
        if (!href || href === '#') return false;
        if (/^#/.test(href)) return false;
        if (/^(mailto:|tel:|javascript:|data:)/.test(href)) return false;
        if (/^https?:\/\//.test(href)) return false; // 外链不处理
        return true;
    }

    function initClickSpark() {
        const canvas = document.getElementById('spark-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let sparks = [];
        let raf = 0;

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        function draw(ts) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#c8ff3e';
            ctx.lineWidth = 2;

            sparks = sparks.filter((s) => {
                const elapsed = ts - s.t0;
                if (elapsed >= CFG.duration) return false;
                const eased = easeOut(elapsed / CFG.duration);
                const dist = eased * CFG.sparkRadius;
                const len = CFG.sparkSize * (1 - eased);
                ctx.beginPath();
                ctx.moveTo(s.x + dist * Math.cos(s.angle), s.y + dist * Math.sin(s.angle));
                ctx.lineTo(s.x + (dist + len) * Math.cos(s.angle), s.y + (dist + len) * Math.sin(s.angle));
                ctx.stroke();
                return true;
            });

            if (sparks.length) raf = requestAnimationFrame(draw);
            else raf = 0;
        }

        function spawnSpark(x, y) {
            const now = performance.now();
            for (let i = 0; i < CFG.sparkCount; i++) {
                sparks.push({ x: x, y: y, angle: (2 * Math.PI * i) / CFG.sparkCount, t0: now });
            }
            if (!raf) raf = requestAnimationFrame(draw);
        }

        // 跨页带过来的坐标：页面加载后在点击处绽放一次
        const entry = readEntryPosition();
        if (entry) spawnSpark(entry.x, entry.y);

        // 点击任意位置绽放火花
        document.addEventListener('click', function (e) {
            spawnSpark(e.clientX, e.clientY);
        });

        // 站内页面链接：把点击坐标写入 URL 参数，立即跳转（零延迟），新页面加载时在点击位置绽放
        document.addEventListener('click', function (e) {
            const link = e.target.closest('a[href]');
            if (!link || !isPageNav(e, link)) return;
            try {
                const url = new URL(link.href, location.href);
                url.searchParams.set('sparkx', String(e.clientX));
                url.searchParams.set('sparky', String(e.clientY));
                link.setAttribute('href', url.toString());
            } catch (err) {
                // URL 解析失败则忽略，保持原导航
            }
        });
    }

    // 统一按钮镜面高光：边缘高光沿按钮描边流动，光向跟随鼠标
    // 参考 specular-button（WebGL）效果：rAF 每帧指数插值，让角度/亮度平滑过渡
    function initSpecularShine() {
        const SELECTOR = '.btn, .nav-cta, .filter-btn, .cta-btn, .nav-links a, .back-btn, .pagination-btn, .cases-prev-btn, .cases-next-btn';
        const els = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
        if (!els.length) return;

        const states = [];
        els.forEach(function (el) {
            if (!el.querySelector('.specular-shine')) {
                const style = getComputedStyle(el);
                if (style.position === 'static') el.style.position = 'relative';
                const span = document.createElement('span');
                span.className = 'specular-shine';
                span.setAttribute('aria-hidden', 'true');
                el.appendChild(span);
            }
            states.push({ el: el, angle: 2.4, t: 0, lastT: 0 });
        });

        let pointerX = null, pointerY = null;
        window.addEventListener('pointermove', function (e) {
            pointerX = e.clientX;
            pointerY = e.clientY;
        }, { passive: true });

        let rects = [];
        function cacheRects() {
            rects = states.map(function (s) {
                const r = s.el.getBoundingClientRect();
                return {
                    left: r.left, top: r.top, right: r.right, bottom: r.bottom,
                    cx: r.left + r.width / 2, cy: r.top + r.height / 2
                };
            });
        }
        cacheRects();
        window.addEventListener('scroll', cacheRects, { passive: true });
        window.addEventListener('resize', cacheRects);

        const PROXIMITY = 120; // 光效感应半径（缩小范围，避免邻近按钮互相干扰）
        const IDLE_SPEED = 0.35; // 鼠标未靠近时，高光沿边缘缓慢扫掠 (rad/s)

        let last = performance.now();
        function update(now) {
            requestAnimationFrame(update);
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            // 指数平滑系数（与原版 1-exp(-dt*k) 一致）：角度 6、亮度 8
            const kA = 1 - Math.exp(-dt * 6);
            const kB = 1 - Math.exp(-dt * 8);

            for (let i = 0; i < states.length; i++) {
                const s = states[i];
                const r = rects[i];

                let targetAngle = null;
                let targetT = 0;
                if (pointerX !== null) {
                    // 亮度按接近程度衰减；光向仅在足够近时才转向鼠标，远处保持自身扫掠
                    const ddx = Math.max(r.left - pointerX, 0, pointerX - r.right);
                    const ddy = Math.max(r.top - pointerY, 0, pointerY - r.bottom);
                    const dist = Math.hypot(ddx, ddy);
                    const raw = Math.max(0, 1 - dist / PROXIMITY);
                    targetT = raw * raw * (3 - 2 * raw); // smoothstep 缓动
                    if (dist < PROXIMITY * 1.5) {
                        targetAngle = Math.atan2(r.cy - pointerY, pointerX - r.cx);
                    }
                }

                if (targetAngle === null) {
                    // 空闲：高光沿边缘自动扫掠
                    s.angle += IDLE_SPEED * dt;
                } else {
                    // 平滑转向鼠标方向（绕圈最短路径）
                    const diff = ((targetAngle - s.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
                    s.angle += diff * kA;
                }
                s.t += (targetT - s.t) * kB;

                // 仅在可见时写入样式，降低重绘开销
                if (s.t > 0.004 || targetT > 0) {
                    s.el.style.setProperty('--shine-angle', s.angle.toFixed(4) + 'rad');
                    s.el.style.setProperty('--shine-t', s.t.toFixed(4));
                } else if (s.lastT > 0.004) {
                    s.el.style.setProperty('--shine-t', '0');
                }
                s.lastT = s.t;
            }
        }
        requestAnimationFrame(update);
    }

    // 读取 URL 中的跨页点击坐标，并移除参数避免刷新重复触发
    function readEntryPosition() {
        let result = null;
        try {
            const url = new URL(location.href);
            const sx = url.searchParams.get('sparkx');
            const sy = url.searchParams.get('sparky');
            if (sx !== null && sy !== null) {
                result = { x: +sx, y: +sy };
                url.searchParams.delete('sparkx');
                url.searchParams.delete('sparky');
                history.replaceState({}, '', url);
            }
        } catch (err) {
            // 忽略 URL 读取或清理异常
        }
        return result;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            initClickSpark();
            initSpecularShine();
        });
    } else {
        initClickSpark();
        initSpecularShine();
    }
})();