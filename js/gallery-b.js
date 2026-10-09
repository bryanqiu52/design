/* js/gallery-b.js
 * 案例「展示方式 B」的交互：主图 + 小地图 + 缩略图切换 + 灯箱
 *
 * 服务对象：build-static.js 生成的静态页（case/*.html）
 *
 * 避让规则：project.html 用的是它自己内联的那套 B 样式逻辑，
 *   本文件检测到页面已有 changeMainImage 时直接退出，不重复绑定，避免两套逻辑打架。
 *   project.html 将来若引入本文件也不会冲突。
 *
 * 行为对齐 project.html 的两个关键判定：
 *   1. 长图判定只看宽高比：高/宽 > 1.5
 *   2. 长图扫描是「项目级」的：图集里只要有任意一张长图，minimap 就常显
 *      （按张判显隐会导致切换图片时 UI 反复抖动）
 */
(function () {
    'use strict';

    /* 页面已有内联逻辑（project.html）就不接管 */
    if (typeof window.changeMainImage === 'function') return;

    var gallery = document.querySelector('.project-gallery.gallery-style-b');
    if (!gallery) return;

    var main = document.getElementById('gallery-main');
    var viewer = document.getElementById('gallery-main-viewer');
    var mainImg = document.getElementById('gallery-main-image');
    var thumbs = Array.prototype.slice.call(gallery.querySelectorAll('.gallery-thumb-item'));
    if (!main || !mainImg || thumbs.length === 0) return;

    /* 图片列表从缩略图的 data-src 读（模板生成时写死，不依赖任何 JS 渲染） */
    var images = thumbs.map(function (t) {
        return t.getAttribute('data-src') || '';
    }).filter(Boolean);
    if (images.length === 0) return;

    var current = 0;
    var projectHasLong = false;  /* 项目级：图集里存在长图 */
    var isLong = false;          /* 当前这张主图是不是长图 */

    function isLongEnough(w, h) {
        return !!w && !!h && (h / w > 1.5);
    }

    function q(sel) { return document.querySelector(sel); }

    /* minimap 视口框：高度按「可视比例」，位置按「滚动进度」；
       框内图片按滚动量上移，露出长图对应的那一段 */
    function updateMinimap() {
        var box = q('#gallery-minimap .minimap-viewport');
        var base = q('#gallery-minimap .minimap-base');
        var vpImg = q('#gallery-minimap .minimap-viewport-img');
        if (!box || !viewer) return;

        var displayedH = base ? base.offsetHeight : 0;
        var scrollRange = viewer.scrollHeight - viewer.clientHeight;

        /* 非长图或没有滚动空间：视口框铺满 minimap，表示整图已完全可见 */
        if (!isLong || scrollRange <= 0) {
            box.style.height = displayedH + 'px';
            box.style.top = '0px';
            if (vpImg) vpImg.style.top = '0px';
            return;
        }

        var ratio = Math.min(1, viewer.clientHeight / viewer.scrollHeight);
        var boxH = Math.max(20, displayedH * ratio);
        var progress = scrollRange > 0 ? viewer.scrollTop / scrollRange : 0;

        box.style.height = boxH + 'px';
        box.style.top = (progress * (displayedH - boxH)) + 'px';
        if (vpImg) {
            vpImg.style.top = (-(viewer.scrollTop / viewer.scrollHeight) * displayedH) + 'px';
        }
    }

    /* 切换主图 */
    function setMain(index) {
        if (index < 0 || index >= images.length) return;
        current = index;
        mainImg.src = images[index];
        thumbs.forEach(function (t, i) { t.classList.toggle('active', i === index); });

        var base = q('#gallery-minimap .minimap-base');
        var vpImg = q('#gallery-minimap .minimap-viewport-img');
        if (base) base.src = images[index];
        if (vpImg) vpImg.src = images[index];
        if (viewer) viewer.scrollTop = 0;

        scanCurrent();
    }

    /* 探测当前主图尺寸，决定是否进入可滚动的长图模式 */
    function scanCurrent() {
        var probe = new Image();
        probe.onload = function () {
            isLong = isLongEnough(probe.naturalWidth, probe.naturalHeight);
            main.classList.toggle('long-image-mode', isLong);
            requestAnimationFrame(function () {
                updateMinimap();
                syncMinimapCursor();
            });
        };
        probe.onerror = function () {
            isLong = false;
            main.classList.remove('long-image-mode');
            requestAnimationFrame(function () {
                updateMinimap();
                syncMinimapCursor();
            });
        };
        probe.src = images[current];
    }

    /* minimap 只在能联动滚动时才显示放大镜；不能联动就退回默认，
       免得光标是放大镜、划过去却没反应 */
    function syncMinimapCursor() {
        var mm = q('#gallery-minimap');
        if (!mm) return;
        var canScrub = isLong && viewer && viewer.scrollHeight > viewer.clientHeight;
        mm.style.cursor = canScrub ? 'zoom-in' : 'default';
    }

    /* 项目级长图扫描：任一张长图 → minimap 常显 */
    function scanProject() {
        var checked = 0;
        var found = false;
        function done() {
            projectHasLong = found;
            gallery.classList.toggle('has-long-image', found);
            requestAnimationFrame(updateMinimap);
        }
        images.forEach(function (src) {
            var probe = new Image();
            probe.onload = function () {
                if (isLongEnough(probe.naturalWidth, probe.naturalHeight)) found = true;
                checked++;
                if (checked === images.length) done();
            };
            probe.onerror = function () {
                checked++;
                if (checked === images.length) done();
            };
            probe.src = src;
        });
    }

    /* ---------- 灯箱 ---------- */
    var overlay = document.getElementById('lightbox-overlay');
    var lbImage = document.getElementById('lightbox-image');
    var lbViewer = document.getElementById('lightbox-image-viewer');
    var lbWrapper = document.getElementById('lightbox-image-wrapper');
    var lbCounter = document.getElementById('lightbox-counter');
    var lbThumbs = document.getElementById('lightbox-thumbnails-container');
    var lbMinimap = document.getElementById('lightbox-minimap');

    /* 缩放/平移状态（对齐 project.html 的 lightboxZoom） */
    var lbZoom = {
        level: 1,       /* 1 = 适应屏幕 */
        panX: 0,
        panY: 0,
        isLongImage: false,
        isDragging: false,
        startX: 0,
        startY: 0,
        startPanX: 0,
        startPanY: 0,
        bgMode: 0       /* 0=黑 1=白 2=棋盘 */
    };

    /* 灯箱里的长图判定：宽高比 > 1.5，且高度超过视口 1.2 倍 */
    function isLbLongImage(nw, nh) {
        if (!nw || !nh) return false;
        return (nh / nw > 1.5) && (nh > window.innerHeight * 1.2);
    }

    function applyLbTransform() {
        if (!lbWrapper) return;
        lbWrapper.style.transform =
            'translate(' + lbZoom.panX + 'px, ' + lbZoom.panY + 'px) scale(' + lbZoom.level + ')';
    }

    function setLbZoom(level) {
        var display = document.getElementById('zoom-level-display');
        lbZoom.level = Math.max(0.1, Math.min(5, level));
        clampLbPan();
        applyLbTransform();
        updateLbMinimap();
        if (display) display.textContent = Math.round(lbZoom.level * 100) + '%';
    }

    function resetLbZoom() {
        var display = document.getElementById('zoom-level-display');
        lbZoom.level = 1;
        lbZoom.panX = 0;
        lbZoom.panY = 0;
        applyLbTransform();
        updateLbMinimap();
        if (display) display.textContent = 'fit';
    }

    /* 夹取平移范围，防止把图拖出可视区 */
    function clampLbPan() {
        if (!lbImage || !lbViewer) return;
        var scaledW = lbImage.offsetWidth * lbZoom.level;
        var scaledH = lbImage.offsetHeight * lbZoom.level;
        var maxX = Math.max(0, (scaledW - lbViewer.clientWidth) / 2);
        var maxY = Math.max(0, (scaledH - lbViewer.clientHeight) / 2);
        lbZoom.panX = Math.max(-maxX, Math.min(maxX, lbZoom.panX));
        lbZoom.panY = Math.max(-maxY, Math.min(maxY, lbZoom.panY));
    }

    /* 切换图片时把缩放/平移/长图标记全部归零 */
    function resetLbLongState() {
        if (overlay) overlay.classList.remove('long-image-mode');
        lbZoom.isLongImage = false;
        lbZoom.level = 1;
        lbZoom.panX = 0;
        lbZoom.panY = 0;
        applyLbTransform();
        var display = document.getElementById('zoom-level-display');
        if (display) display.textContent = 'fit';
    }

    /* 灯箱 minimap：基于 transform（不是 scrollTop）算视口框 */
    function updateLbMinimap() {
        if (!lbZoom.isLongImage) return;
        var box = q('#lightbox-minimap .minimap-viewport');
        var base = q('#lightbox-minimap .minimap-base');
        var vpImg = q('#lightbox-minimap .minimap-viewport-img');
        if (!lbImage || !lbViewer || !base || !box) return;

        var scaledH = lbImage.offsetHeight * lbZoom.level;
        var viewerH = lbViewer.clientHeight;
        var minimapH = base.offsetHeight;

        var ratio = Math.min(1, viewerH / scaledH);
        var boxH = Math.max(20, minimapH * ratio);

        /* pan 进度：0=顶 0.5=中 1=底 */
        var progress = 0.5;
        var panRange = scaledH - viewerH;
        if (panRange > 0) {
            progress = Math.max(0, Math.min(1, 0.5 - lbZoom.panY / panRange));
        }
        var boxTop = progress * (minimapH - boxH);

        box.style.height = boxH + 'px';
        box.style.top = boxTop + 'px';
        box.style.display = 'block';
        if (vpImg) vpImg.style.top = (-boxTop) + 'px';
    }

    /* 灯箱 minimap 悬停/拖拽跟随 */
    function scrubLbMinimap(clientY) {
        var box = q('#lightbox-minimap .minimap-base');
        var vbox = q('#lightbox-minimap .minimap-viewport');
        if (!box || !vbox) return;

        var rect = box.getBoundingClientRect();
        var minimapH = rect.height;
        var boxH = vbox.offsetHeight;
        var mouseY = Math.max(0, Math.min(minimapH, clientY - rect.top));
        var boxTop = Math.max(0, Math.min(minimapH - boxH, mouseY - boxH / 2));

        vbox.style.top = boxTop + 'px';
        var vimg = q('#lightbox-minimap .minimap-viewport-img');
        if (vimg) vimg.style.top = (-boxTop) + 'px';

        if (!lbImage || !lbViewer) return;
        var panRange = lbImage.offsetHeight * lbZoom.level - lbViewer.clientHeight;
        if (panRange > 0 && minimapH - boxH > 0) {
            lbZoom.panY = (0.5 - boxTop / (minimapH - boxH)) * panRange;
            applyLbTransform();
        }
    }

    /* 灯箱事件只绑一次：滚轮缩放 / 拖拽平移 / 按钮 / minimap */
    var lbEventsBound = false;
    /* 灯箱内翻页：主图、缩略图高亮、大图一起跟着走 */
    function stepLb(delta) {
        if (images.length === 0) return;
        current = (current + delta + images.length) % images.length;
        setMain(current);
        loadLbImage();
    }

    function initLbEvents() {
        if (lbEventsBound || !lbViewer) return;
        lbEventsBound = true;

        /* 滚轮 = 缩放 */
        lbViewer.addEventListener('wheel', function (e) {
            e.preventDefault();
            setLbZoom(lbZoom.level + (e.deltaY < 0 ? 0.15 : -0.15));
        }, { passive: false });

        /* 拖拽 = 平移 */
        lbViewer.addEventListener('mousedown', function (e) {
            lbZoom.isDragging = true;
            lbZoom.startX = e.clientX;
            lbZoom.startY = e.clientY;
            lbZoom.startPanX = lbZoom.panX;
            lbZoom.startPanY = lbZoom.panY;
            lbViewer.classList.add('dragging');
            e.preventDefault();
        });
        document.addEventListener('mousemove', function (e) {
            if (!lbZoom.isDragging) return;
            lbZoom.panX = lbZoom.startPanX + (e.clientX - lbZoom.startX);
            lbZoom.panY = lbZoom.startPanY + (e.clientY - lbZoom.startY);
            clampLbPan();
            applyLbTransform();
            updateLbMinimap();
        });
        document.addEventListener('mouseup', function () {
            if (!lbZoom.isDragging) return;
            lbZoom.isDragging = false;
            lbViewer.classList.remove('dragging');
        });

        /* 灯箱 minimap 悬停 + 拖拽 */
        var lbMDrag = false;
        if (lbMinimap) {
            lbMinimap.addEventListener('mousemove', function (e) {
                if (!lbZoom.isLongImage) return;
                scrubLbMinimap(e.clientY);
            });
            lbMinimap.addEventListener('mousedown', function (e) {
                if (!lbZoom.isLongImage) return;
                lbMDrag = true;
                scrubLbMinimap(e.clientY);
                e.preventDefault();
                e.stopPropagation();
            });
            document.addEventListener('mousemove', function (e) {
                if (lbMDrag) scrubLbMinimap(e.clientY);
            });
            document.addEventListener('mouseup', function () {
                lbMDrag = false;
            });
        }

        window.addEventListener('resize', function () {
            clampLbPan();
            applyLbTransform();
            updateLbMinimap();
        });

        /* 缩放控件栏 */
        var zIn = document.getElementById('zoom-in-btn');
        var zOut = document.getElementById('zoom-out-btn');
        var zReset = document.getElementById('zoom-reset-btn');
        var zDisplay = document.getElementById('zoom-level-display');
        var bgBtn = document.getElementById('bg-toggle-btn');

        if (zIn) zIn.addEventListener('click', function () { setLbZoom(lbZoom.level + 0.2); });
        if (zOut) zOut.addEventListener('click', function () { setLbZoom(lbZoom.level - 0.2); });
        if (zReset) zReset.addEventListener('click', resetLbZoom);
        if (zDisplay) zDisplay.addEventListener('click', resetLbZoom);
        if (bgBtn) bgBtn.addEventListener('click', function () {
            var modes = ['', 'bg-white', 'bg-checker'];
            lbZoom.bgMode = (lbZoom.bgMode + 1) % 3;
            if (!overlay) return;
            overlay.classList.remove('bg-white', 'bg-checker');
            if (modes[lbZoom.bgMode]) overlay.classList.add(modes[lbZoom.bgMode]);
        });

        /* 关闭 / 上一张 / 下一张：这三个按钮一直在 DOM 里，之前漏了绑定，
           所以看着像「控件没了」——实际是点了没反应 */
        var lbClose = document.getElementById('lightbox-close');
        var lbPrev = document.getElementById('lightbox-prev');
        var lbNext = document.getElementById('lightbox-next');

        if (lbClose) lbClose.addEventListener('click', closeLightbox);
        if (lbPrev) lbPrev.addEventListener('click', function () { stepLb(-1); });
        if (lbNext) lbNext.addEventListener('click', function () { stepLb(1); });

        /* 键盘：ESC 关闭，左右方向键翻页（只在灯箱打开时响应） */
        document.addEventListener('keydown', function (e) {
            if (!overlay || !overlay.classList.contains('active')) return;
            if (e.key === 'Escape') closeLightbox();
            else if (e.key === 'ArrowLeft') stepLb(-1);
            else if (e.key === 'ArrowRight') stepLb(1);
        });
    }

    function loadLbImage() {
        if (!lbImage) return;
        resetLbLongState();
        lbImage.src = images[current];
        if (lbCounter) lbCounter.textContent = (current + 1) + ' / ' + images.length;
        if (lbThumbs) {
            Array.prototype.forEach.call(lbThumbs.children, function (el, i) {
                el.classList.toggle('active', i === current);
            });
        }

        /* 探测当前图是不是长图：是才亮出 minimap 和缩放栏 */
        var probe = new Image();
        probe.onload = function () {
            if (!isLbLongImage(probe.naturalWidth, probe.naturalHeight)) return;
            if (overlay) overlay.classList.add('long-image-mode');
            lbZoom.isLongImage = true;
            var base = q('#lightbox-minimap .minimap-base');
            var vpImg = q('#lightbox-minimap .minimap-viewport-img');
            if (base) base.src = images[current];
            if (vpImg) vpImg.src = images[current];
            requestAnimationFrame(updateLbMinimap);
        };
        probe.src = images[current];
    }

    function renderLbThumbs() {
        if (!lbThumbs) return;
        lbThumbs.innerHTML = images.map(function (src, i) {
            return '<div class="lightbox-thumbnail-item' + (i === current ? ' active' : '') +
                   '" data-index="' + i + '"><img src="' + src + '" alt=""></div>';
        }).join('');
        Array.prototype.forEach.call(lbThumbs.children, function (el) {
            el.addEventListener('click', function () {
                current = parseInt(el.getAttribute('data-index'), 10) || 0;
                setMain(current);
                loadLbImage();
            });
        });
    }

    function openLightbox(index) {
        if (!overlay) return;
        current = index;
        /* 首次打开才绑灯箱的滚轮/拖拽/按钮事件 */
        initLbEvents();
        renderLbThumbs();
        loadLbImage();
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        if (!overlay) return;
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    /* ---------- 事件绑定 ---------- */
    thumbs.forEach(function (t) {
        t.addEventListener('click', function () {
            setMain(parseInt(t.getAttribute('data-index'), 10) || 0);
        });
    });

    /* 主图点击一律弹灯箱。长图模式下要区分「点一下」和「按住拖动查看」，
       所以不挂 click，统一在 mouseup 里按位移判定（见下方拖拽逻辑） */

    if (viewer) {
        viewer.addEventListener('scroll', function () {
            if (isLong) updateMinimap();
        }, { passive: true });

        /* 滚轮落在主图区域：滚主图本身，不能把页面带着一起滚走
           （必须 passive:false，否则 preventDefault 无效）
           只有还有余量时才拦截；已经滚到顶/底就把滚动交还给页面，避免手感像卡死 */
        viewer.addEventListener('wheel', function (e) {
            if (!isLong) return;
            var max = viewer.scrollHeight - viewer.clientHeight;
            if (max <= 0) return;
            var atTop = viewer.scrollTop <= 0 && e.deltaY < 0;
            var atBottom = viewer.scrollTop >= max - 1 && e.deltaY > 0;
            if (atTop || atBottom) return;
            e.preventDefault();
            viewer.scrollTop += e.deltaY;
        }, { passive: false });
    }

    /* minimap 悬停/拖拽跟随：鼠标在小地图上滑动，亮框跟着走并联动主图滚动。
       不用点击，悬停即跟随——这样小地图相当于一个「放大镜」，指哪看哪 */
    var minimap = document.getElementById('gallery-minimap');
    var mDragging = false;

    function scrubMinimap(clientY) {
        var box = q('#gallery-minimap .minimap-base');
        var vbox = q('#gallery-minimap .minimap-viewport');
        if (!box || !vbox || !viewer) return;

        var rect = box.getBoundingClientRect();
        var minimapH = rect.height;
        var boxH = vbox.offsetHeight;
        var mouseY = Math.max(0, Math.min(minimapH, clientY - rect.top));
        /* 亮框中心锁在鼠标上，再夹进合法范围 */
        var boxTop = Math.max(0, Math.min(minimapH - boxH, mouseY - boxH / 2));

        vbox.style.top = boxTop + 'px';
        var vimg = q('#gallery-minimap .minimap-viewport-img');
        if (vimg) vimg.style.top = (-boxTop) + 'px';

        var range = viewer.scrollHeight - viewer.clientHeight;
        if (range > 0 && minimapH - boxH > 0) {
            viewer.scrollTop = (boxTop / (minimapH - boxH)) * range;
        }
    }

    if (minimap) {
        /* 光标由 syncMinimapCursor() 按能否联动来定，这里不硬写 */
        minimap.addEventListener('mousemove', function (e) {
            if (!isLong) return;
            if (viewer.scrollHeight <= viewer.clientHeight) return;
            scrubMinimap(e.clientY);
        });
        minimap.addEventListener('mousedown', function (e) {
            if (!isLong) return;
            mDragging = true;
            scrubMinimap(e.clientY);
            e.preventDefault();
            e.stopPropagation();
        });
        document.addEventListener('mousemove', function (e) {
            if (mDragging) scrubMinimap(e.clientY);
        });
        document.addEventListener('mouseup', function () {
            mDragging = false;
        });
    }

    /* 主图光标统一显示放大镜（提示可点击看大图），覆盖 CSS 里的抓手 grab */
    main.style.cursor = 'zoom-in';

    /* 主图：按住可上下拖动查看长图；但只要没拖动（就是「点一下」），一律弹灯箱 */
    var downOnMain = false;
    var dDragging = false;
    var dStartY = 0;
    var dStartTop = 0;
    var downX = 0;
    var downY = 0;
    var moved = 0;

    main.addEventListener('mousedown', function (e) {
        downOnMain = true;
        downX = e.clientX;
        downY = e.clientY;
        moved = 0;
        /* 非长图不拦事件，让它走正常点击 */
        if (!isLong || !viewer) return;
        dDragging = true;
        dStartY = e.clientY;
        dStartTop = viewer.scrollTop;
        main.style.cursor = 'grabbing';
        e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
        if (downOnMain) {
            moved = Math.max(moved, Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY));
        }
        if (!dDragging || !viewer) return;
        viewer.scrollTop = dStartTop - (e.clientY - dStartY);
    });
    document.addEventListener('mouseup', function () {
        /* 位移超过 5px 算拖动查看，不弹灯箱；没超过就是点击 */
        var wasDrag = dDragging && moved > 5;
        if (dDragging) {
            dDragging = false;
            main.style.cursor = 'zoom-in';
        }
        if (downOnMain) {
            downOnMain = false;
            if (!wasDrag) openLightbox(current);
        }
    });

    var btnClose = document.getElementById('lightbox-close');
    var btnPrev = document.getElementById('lightbox-prev');
    var btnNext = document.getElementById('lightbox-next');
    if (btnClose) btnClose.addEventListener('click', closeLightbox);
    if (btnPrev) btnPrev.addEventListener('click', function () {
        current = (current - 1 + images.length) % images.length;
        setMain(current);
        loadLbImage();
    });
    if (btnNext) btnNext.addEventListener('click', function () {
        current = (current + 1) % images.length;
        setMain(current);
        loadLbImage();
    });
    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeLightbox();
        });
    }
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' || !overlay || !overlay.classList.contains('active')) return;
        closeLightbox();
    });

    /* ---------- 启动 ---------- */
    setMain(0);
    scanProject();
})();
