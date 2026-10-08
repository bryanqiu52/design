/* fullpage.js
 * 整页切换控制：滚轮/方向键/指示器跳屏，平滑缓动，侧边指示器高亮。
 * 兼容：file:// 直接打开 与 GitHub Pages。
 * 设计原则：
 *  - 不改为"隐藏式 PPT"，保留页面正常结构，让超高屏内部仍可上下滚动。
 *  - 每次滚轮操作把页面平滑滚动到"当前屏"的顶部（或下一屏顶部），带缓动。
 *  - 侧边渲染小圆点指示器 + 数字，点击可跳屏。
 *  - 激活屏添加 .fp-active，用于触发该屏内容的进入/退出动画。
 *  - 横向卡片区：鼠标悬停在卡片上时滚轮只做横向滚动；移出卡片区才翻页。
 *  - 一次滚轮手势最多翻一屏（2026-10-08 改）：累积够了才翻，翻完整段惯性余波一律吞掉，
 *    不会出现"一滚滚两屏"。要恢复连翻就把 MAX_STEPS_PER_GESTURE 调成 2~3。
 * 若要整体关闭本功能，删除 <script src="js/fullpage.js"></script> 即可。
 */
(function () {
    'use strict';

    /* 参与整页切换的屏（按页面出现顺序）。第 3 屏是横向滚动区，也作为一屏。 */
    function getSections() {
        return Array.prototype.slice.call(document.querySelectorAll(
            '.hero, .services, .horizontal-scroll-section, .featured-works, ' +
            '.brand-story, .blog-section, .process, #site-footer'
        )).filter(function (el) { return el.offsetParent !== null || el.getBoundingClientRect().height > 0; });
    }

    var sections = [];
    var currentIndex = 0;
    var isAnimating = false;
    var dotWrap = null;
    var scrollHint = null;
    var rafId = null;        // 当前滚动动画帧句柄（防重入，避免两套动画抢 scrollTo）

    /* ===== 手势节流：一次滚轮手势最多翻一屏，杜绝"一滚滚两屏" =====
     * 背景：鼠标滚轮/触控板一次搓动会连续发出几百毫秒的 wheel 事件（惯性尤其久），
     *       若每次事件都翻屏，一次手势就冲过去两三屏。
     * 规则：
     *  1. 相邻 wheel 静默超过 GESTURE_GAP 视为"新手势"，重新拿到翻页资格；
     *  2. 手势内累计位移达到 WHEEL_TRIGGER 才真的翻一屏（滤掉触控板 1~2px 抖动）；
     *  3. 翻完后本手势不再翻（MAX_STEPS_PER_GESTURE 控制），期间的滚轮一律吞掉（仍需 preventDefault，
     *     否则原生滚动和缓动动画抢位置，就是之前那个"抽搐"的老毛病）；
     *  4. 动画期间 + 落屏后的 ANIM_COOLDOWN 冷却期内同样只吞不翻。
     */
    var WHEEL_TRIGGER = 40;         // 触发翻页的累计滚动量（px）
    var GESTURE_GAP = 260;          // 静默多久算换手势（ms）
    var ANIM_COOLDOWN = 120;        // 动画结束后的落屏保护（ms）
    var MAX_STEPS_PER_GESTURE = 1;  // 一次手势最多翻几屏（想恢复"猛滚连翻"改成 2~3）
    var PAGE_DURATION = 560;        // 翻屏动画时长（ms）

    var gestureAccum = 0;           // 本次手势累计的滚动量
    var gestureSteps = 0;           // 本次手势已经翻了几屏
    var gestureLocked = false;      // 本次手势的翻页资格是否已用完
    var gestureTimer = null;        // 手势静默判定定时器
    var lastWheelTime = 0;
    var lockUntil = 0;              // 翻页冷却截止时间戳

    /* 归一化不同浏览器的滚动量：行模式/页模式统一折算成像素 */
    function normalizeDelta(e) {
        var d = e.deltaY;
        if (e.deltaMode === 1) d *= 16;                    // DOM_DELTA_LINE
        else if (e.deltaMode === 2) d *= window.innerHeight; // DOM_DELTA_PAGE
        return d;
    }

    /* 记录一次 wheel：判定是否新手势，并按静默时间自动收尾 */
    function markWheelGesture(now) {
        if (now - lastWheelTime > GESTURE_GAP) {
            gestureLocked = false;
            gestureSteps = 0;
            gestureAccum = 0;
        }
        lastWheelTime = now;
        if (gestureTimer) clearTimeout(gestureTimer);
        gestureTimer = setTimeout(function () {
            gestureTimer = null;
            gestureLocked = false;
            gestureSteps = 0;
            gestureAccum = 0;
        }, GESTURE_GAP);
    }

    /* 上翻页锁：冷却期内任何滚动输入都只吞不翻 */
    function lockPage(ms) {
        var until = Date.now() + ms;
        if (until > lockUntil) lockUntil = until;
    }

    function lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    /* 动画滚动到指定 Y 位置（缓动） */
    function smoothScrollTo(targetY, duration, done) {
        var startY = window.scrollY || window.pageYOffset;
        var diff = targetY - startY;
        if (Math.abs(diff) < 1) { if (done) done(); return; }
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        var startTime = null;
        isAnimating = true;
        function step(ts) {
            if (!startTime) startTime = ts;
            var p = Math.min(1, (ts - startTime) / (duration || 520));
            var ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOutQuad
            window.scrollTo(0, startY + diff * ease);
            if (p < 1) {
                rafId = requestAnimationFrame(step);
            } else {
                rafId = null;
                window.scrollTo(0, targetY);
                isAnimating = false;
                if (done) done();
                /* 落屏瞬间短暂冷却：收拾动画余波，避免刚到位就被下一格带走 */
                lockPage(ANIM_COOLDOWN);
            }
        }
        rafId = requestAnimationFrame(step);
    }

    function sectionTop(el) {
        return el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset);
    }

    /* 设置当前激活屏：更新指示器 + 切换各屏的 .fp-active（触发进入/退出动画）+ 下滑提示显隐 */
    function setActive(index) {
        if (index < 0) index = 0;
        if (index > sections.length - 1) index = sections.length - 1;
        currentIndex = index;
        updateDots();
        for (var i = 0; i < sections.length; i++) {
            sections[i].classList.toggle('fp-active', i === index);
        }
        /* 只有还有下一屏时才显示"向下滑动"提示 */
        if (scrollHint) scrollHint.classList.toggle('show', index < sections.length - 1);
    }

    function goTo(index) {
        /* 主动跳屏（指示器/键盘）：占用本次手势的资格并上锁到动画结束，
           避免落屏后被同一手势的余波接着翻走 */
        gestureAccum = 0;
        gestureSteps = MAX_STEPS_PER_GESTURE;
        gestureLocked = true;
        lastWheelTime = Date.now();
        setActive(index);
        smoothScrollTo(sectionTop(sections[index]), PAGE_DURATION);
    }

    /* 到了首尾边界没能真的翻屏时，把这次手势的资格还回去，避免"推不动"的卡顿感 */
    function releaseGesture() {
        gestureAccum = 0;
        gestureSteps = 0;
        gestureLocked = false;
    }

    function goPrev() {
        if (currentIndex > 0) goTo(currentIndex - 1);
        else releaseGesture();
    }
    function goNext() {
        if (currentIndex < sections.length - 1) goTo(currentIndex + 1);
        else releaseGesture();
    }

    /* 判断当前视口中心落在第几屏 */
    function detectIndex() {
        var mid = window.scrollY + window.innerHeight / 2;
        var best = 0;
        for (var i = 0; i < sections.length; i++) {
            var top = sectionTop(sections[i]);
            var bottom = top + sections[i].offsetHeight;
            if (mid >= top && mid < bottom) { best = i; break; }
            if (mid < top) { best = i; break; }
        }
        /* 滚过最后一屏（如页脚区域）时保持最后屏，避免误跳回第 1 屏 */
        var last = sections[sections.length - 1];
        if (mid > sectionTop(last) + last.offsetHeight) best = sections.length - 1;
        return best;
    }

    /* 横向进度条：根据滚动位置更新绿色渐变条宽度 */
    function updateHsProgress() {
        var fill = document.querySelector('.hs-progress-fill');
        var wrap = document.querySelector('.hs-progress');
        var hsContainer = document.querySelector('.horizontal-scroll-section .hs-slider-container');
        if (!fill || !wrap || !hsContainer) return;
        var max = hsContainer.scrollWidth - hsContainer.clientWidth;
        if (max <= 0) { wrap.classList.remove('show'); fill.style.width = '0%'; return; }
        var pct = Math.max(0, Math.min(1, hsContainer.scrollLeft / max));
        fill.style.width = (pct * 100) + '%';
        wrap.classList.add('show');
    }

    /* 平滑横向滚动（lerp 缓动），解决滚轮横向"一卡一卡"的问题 */
    var hTarget = 0;
    var hAnimating = false;
    function smoothHorizontal(delta) {
        var hsContainer = document.querySelector('.horizontal-scroll-section .hs-slider-container');
        if (!hsContainer) return;
        var max = hsContainer.scrollWidth - hsContainer.clientWidth;
        hTarget = hsContainer.scrollLeft + delta;
        if (hTarget < 0) hTarget = 0;
        if (hTarget > max) hTarget = max;
        if (hAnimating) return;
        hAnimating = true;
        function step() {
            var cur = hsContainer.scrollLeft;
            var diff = hTarget - cur;
            if (Math.abs(diff) < 1) {
                hsContainer.scrollLeft = hTarget;
                hAnimating = false;
                updateHsProgress();
                return;
            }
            hsContainer.scrollLeft = cur + diff * 0.18;
            updateHsProgress();
            requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    /* 横向卡片区：当前屏为横向屏且鼠标落在卡片区域时，只做平滑横向滚动 */
    function handleHorizontal(e) {
        var hsContainer = document.querySelector('.horizontal-scroll-section .hs-slider-container');
        if (!hsContainer) return false;
        var cur = sections[currentIndex] || sections[detectIndex()];
        if (!cur) return false;
        if (!cur.classList.contains('horizontal-scroll-section')) return false;
        if (!hsContainer.contains(e.target)) return false;

        var delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY)) ? e.deltaX : e.deltaY;
        smoothHorizontal(delta);
        return true;
    }

    /* 处理滚轮：一次手势最多翻一屏；卡片区内走横向、超高屏内部走原生 */
    function onWheel(e) {
        var now = Date.now();
        var dy = normalizeDelta(e);

        /* 1) 动画中 / 落屏冷却中：必须吞掉滚轮（preventDefault），
              否则原生滚动与逐帧 scrollTo 互相拉扯 → 当年的"抽搐"会复发 */
        if (isAnimating || now < lockUntil) {
            markWheelGesture(now);
            e.preventDefault();
            return;
        }
        if (Math.abs(dy) < 1) { e.preventDefault(); return; }

        /* 2) 横向卡片区：滚轮映射成横向滚动 */
        if (handleHorizontal(e)) { e.preventDefault(); return; }

        var y = window.scrollY || window.pageYOffset;
        var maxScroll = document.documentElement.getBoundingClientRect().height - window.innerHeight;

        /* 3) 超高屏内部：屏本身高于视口且还没滚到它的边界 → 交还给浏览器原生滚动 */
        currentIndex = detectIndex();
        var cur = sections[currentIndex];
        if (cur) {
            var curTop = sectionTop(cur);
            var curBottom = curTop + cur.offsetHeight;
            var inside = (y > curTop + 2 && y < curBottom - window.innerHeight - 2);
            if (inside && cur.offsetHeight > window.innerHeight + 4) return;
        }

        /* 4) 边界保护：页面已到底、已到顶、或已在最后一屏（页脚）→ 放行原生滚动 */
        if (dy > 0 && (y >= maxScroll - 2 || currentIndex >= sections.length - 1)) return;
        if (dy < 0 && y <= 2) return;

        /* 5) 接管：到这里才由 JS 控制翻屏 */
        markWheelGesture(now);
        e.preventDefault();

        if (gestureLocked || gestureSteps >= MAX_STEPS_PER_GESTURE) {
            return; // 本次手势的额度已用完，余波（惯性）一律忽略
        }
        /* 中途反向视为新意图，重新开始累计 */
        if (gestureAccum !== 0 && (gestureAccum > 0) !== (dy > 0)) gestureAccum = 0;
        gestureAccum += dy;
        if (Math.abs(gestureAccum) < WHEEL_TRIGGER) return; // 还不够一格，先攒着（滤抖动）

        gestureAccum = 0;
        gestureSteps += 1;
        gestureLocked = true;
        if (dy > 0) goNext(); else goPrev();
    }

    var PAGE_KEYS = { ArrowDown: 1, PageDown: 1, ArrowUp: 1, PageUp: 1, Home: 1, End: 1 };

    function onKey(e) {
        var now = Date.now();
        var tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        /* 只接管翻屏相关的键，其余（F5/Ctrl+R/Tab…）一律放行，不要再被吞掉 */
        if (!PAGE_KEYS[e.key]) return;
        if (isAnimating || now < lockUntil) { e.preventDefault(); return; } // 动画/冷却期吞掉按键，避免与滚动动画打架
        /* 键盘同样按"一次一格"处理，长按不连跳 */
        markWheelGesture(now);
        gestureLocked = true;
        switch (e.key) {
            case 'ArrowDown':
            case 'PageDown':
                e.preventDefault(); goNext(); break;
            case 'ArrowUp':
            case 'PageUp':
                e.preventDefault(); goPrev(); break;
            case 'Home':
                e.preventDefault(); goTo(0); break;
            case 'End':
                e.preventDefault(); goTo(sections.length - 1); break;
        }
    }

    /* ========== 侧边指示器 ========== */
    function updateDots() {
        if (!dotWrap) return;
        var dots = dotWrap.querySelectorAll('.fp-dot');
        for (var i = 0; i < dots.length; i++) {
            dots[i].classList.toggle('active', i === currentIndex);
        }
    }

    function buildDots() {
        if (dotWrap || sections.length === 0) return;
        dotWrap = document.createElement('div');
        dotWrap.className = 'fp-dots';
        dotWrap.setAttribute('aria-label', '页面导航');
        var labels = ['首页', '我们的服务', '创意为品牌赋能', '精选案例', '溪风', '合作流程', '最新动态', '联系我们'];
        for (var i = 0; i < sections.length; i++) {
            (function (idx) {
                var dot = document.createElement('button');
                dot.className = 'fp-dot';
                dot.type = 'button';
                dot.title = (labels[idx] || '第' + (idx + 1) + '屏');
                dot.innerHTML = '<span>' + (idx + 1) + '</span>';
                dot.addEventListener('click', function () { goTo(idx); });
                dotWrap.appendChild(dot);
            })(i);
        }
        document.body.appendChild(dotWrap);
    }

    /* ========== 初始化 ========== */
    function init() {
        sections = getSections();
        if (sections.length === 0) return;

        /* 移动端(≤768px)解除整屏吸附翻页：滚轮/方向键/触摸翻页均不启用，恢复原生自由滚动 */
        var isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;

        buildDots();

        /* "向下滑动"提示（绿渐变下滑条 + 箭头）：挂在右侧导航 .fp-dots 下方，仅在还有下一屏时显示 */
        scrollHint = document.createElement('div');
        scrollHint.className = 'fp-scroll-hint';
        scrollHint.innerHTML = '<span class="bar"></span><i class="fas fa-chevron-down arrow"></i>';
        if (dotWrap) {
            dotWrap.appendChild(scrollHint);
        } else {
            document.body.appendChild(scrollHint);
        }

        setActive(detectIndex());

        /* 横向卡片进度条：监听原生滚动 + 窗口尺寸变化，实时更新 */
        var hsContainer = document.querySelector('.horizontal-scroll-section .hs-slider-container');
        if (hsContainer) hsContainer.addEventListener('scroll', updateHsProgress, { passive: true });
        window.addEventListener('resize', updateHsProgress);
        updateHsProgress();

        var ticking = false;
        window.addEventListener('scroll', function () {
            if (isAnimating) return; // 程序动画期间不参与活跃屏判定，避免抖动
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () {
                var idx = detectIndex();
                if (idx !== currentIndex) {
                    setActive(idx);
                }
                ticking = false;
            });
        }, { passive: true });

        var wheelOpt = { passive: false };
        if (!isMobile) {
            window.addEventListener('wheel', onWheel, wheelOpt);
            window.addEventListener('keydown', onKey);
        }

        /* 触摸翻页：桌面/平板触屏设备保留原逻辑（横滑交给原生横向滚卡片、纵滑翻页）；
           移动端(≤768px)不启用，恢复原生自由滚动 */
        if (!isMobile) {
        var touchStartY = null;
        var touchStartX = null;
        var touchInHs = false;
        window.addEventListener('touchstart', function (e) {
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
            var hsContainer = document.querySelector('.horizontal-scroll-section .hs-slider-container');
            touchInHs = !!(hsContainer && hsContainer.contains(e.target));
        }, { passive: true });
        window.addEventListener('touchend', function (e) {
            if (touchStartY === null) return;
            /* 上一次翻页还没稳住就再滑：直接丢弃，与滚轮同为"一次手势一屏" */
            if (isAnimating || Date.now() < lockUntil) { touchStartY = null; return; }
            var endY = e.changedTouches[0].clientY;
            var endX = e.changedTouches[0].clientX;
            var dy = touchStartY - endY;
            var dx = touchStartX - endX;
            // 卡片区：横向手势交给原生横滑，仅纵向手势才允许翻页
            if (touchInHs) {
                if (Math.abs(dx) > Math.abs(dy)) { touchStartY = null; return; } // 横滑，不翻页
            }
            var cur = sections[currentIndex] || sections[detectIndex()];
            if (cur && cur.offsetHeight > window.innerHeight + 4) {
                var y = window.scrollY || window.pageYOffset;
                var curTop = sectionTop(cur);
                if (y > curTop + 2 && y < curTop + cur.offsetHeight - window.innerHeight - 2) {
                    touchStartY = null; return; // 超高屏内部自由滚动
                }
            }
            if (Math.abs(dy) > 60) { if (dy > 0) goNext(); else goPrev(); }
            touchStartY = null;
        }, { passive: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
