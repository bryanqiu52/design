/* fullpage.js
 * 整页切换控制：滚轮/方向键/指示器跳屏，平滑缓动，侧边指示器高亮。
 * 兼容：file:// 直接打开 与 GitHub Pages。
 * 设计原则：
 *  - 不改为"隐藏式 PPT"，保留页面正常结构，让超高屏内部仍可上下滚动。
 *  - 每次滚轮操作把页面平滑滚动到"当前屏"的顶部（或下一屏顶部），带缓动。
 *  - 侧边渲染小圆点指示器 + 数字，点击可跳屏。
 *  - 激活屏添加 .fp-active，用于触发该屏内容的进入/退出动画。
 *  - 横向卡片区：鼠标悬停在卡片上时滚轮只做横向滚动；移出卡片区才翻页。
 * 若要整体关闭本功能，删除 <script src="js/fullpage.js"></script> 即可。
 */
(function () {
    'use strict';

    /* 参与整页切换的屏（按页面出现顺序）。第 3 屏是横向滚动区，也作为一屏。 */
    function getSections() {
        return Array.prototype.slice.call(document.querySelectorAll(
            '.hero, .services, .horizontal-scroll-section, .featured-works, ' +
            '.brand-story, .blog-section, .process, .cta-section'
        )).filter(function (el) { return el.offsetParent !== null || el.getBoundingClientRect().height > 0; });
    }

    var sections = [];
    var currentIndex = 0;
    var isAnimating = false;
    var dotWrap = null;
    var scrollHint = null;

    function lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    /* 动画滚动到指定 Y 位置（缓动） */
    function smoothScrollTo(targetY, duration, done) {
        var startY = window.scrollY || window.pageYOffset;
        var diff = targetY - startY;
        if (Math.abs(diff) < 1) { if (done) done(); return; }
        var startTime = null;
        isAnimating = true;
        function step(ts) {
            if (!startTime) startTime = ts;
            var p = Math.min(1, (ts - startTime) / (duration || 520));
            var ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOutQuad
            window.scrollTo(0, startY + diff * ease);
            if (p < 1) {
                requestAnimationFrame(step);
            } else {
                window.scrollTo(0, targetY);
                isAnimating = false;
                if (done) done();
            }
        }
        requestAnimationFrame(step);
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
        setActive(index);
        smoothScrollTo(sectionTop(sections[index]), 620);
    }

    function goPrev() {
        if (currentIndex > 0) goTo(currentIndex - 1);
    }
    function goNext() {
        if (currentIndex < sections.length - 1) goTo(currentIndex + 1);
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

    /* 处理滚轮：先在卡片区横向滚动，仅在屏边缘且非超高屏内部滚动时翻页 */
    function onWheel(e) {
        if (isAnimating) return;
        if (handleHorizontal(e)) { e.preventDefault(); return; }

        var rect = document.documentElement.getBoundingClientRect();
        var maxScroll = rect.height - window.innerHeight;
        var y = window.scrollY || window.pageYOffset;

        /* 超高屏内部滚动检测：当前屏本身超出视口，且滚动未到其边缘 */
        var cur = sections[currentIndex] || sections[detectIndex()];
        if (cur) {
            var curTop = sectionTop(cur);
            var curBottom = curTop + cur.offsetHeight;
            var inside = (y > curTop + 2 && y < curBottom - window.innerHeight - 2);
            if (inside && cur.offsetHeight > window.innerHeight + 4) {
                return; // 让浏览器原生滚动，直到滚到屏边界
            }
        }

        /* 底部/顶部边界保护 */
        if (e.deltaY > 0) {
            if (y >= maxScroll - 2) return;
            /* 已到最后屏：放行原生滚动，让页脚内容也能看到 */
            if (currentIndex >= sections.length - 1) return;
            goNext();
        } else {
            if (y <= 2) return;
            goPrev();
        }
        e.preventDefault();
    }

    function onKey(e) {
        if (isAnimating) return;
        var tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
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
        window.addEventListener('wheel', onWheel, wheelOpt);
        window.addEventListener('keydown', onKey);

        /* 移动端触摸：记录起始坐标与是否落在卡片区。
           横滑手势交给原生横向滚卡片；纵滑手势正常翻页（避免卡片区占满屏幕导致无法向下翻页） */
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
