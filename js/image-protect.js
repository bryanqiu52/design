/* image-protect.js
 * 图片防下载模块（针对普通用户，不对抗开发者工具）
 * 核心能力：
 *   1. 全局禁止右键菜单（针对 IMG 和遮罩）
 *   2. 全局禁止图片拖拽（dragstart 拦截）
 *   3. <img> 自动添加 draggable="false"（三重保险之一）
 *   4. 透明遮罩物理隔离：在单图容器内插入 .img-protect-overlay 拦截所有鼠标操作
 *   5. CSS 全局设置 user-select / -webkit-touch-callout / -webkit-user-drag（在 styles.css 中）
 *
 * 实现策略：
 *   - 不改变 <img> 在 DOM 中的位置，避免破坏现有 CSS 选择器和响应式布局
 *   - 仅在「父容器只含该 <img> 一个元素」时插入 overlay，防止误伤兄弟元素的点击事件
 *   - 跳过需要保留交互的图片：链接中的图片、缩略图、minimap、二维码等
 *   - 使用 MutationObserver 处理 JS 动态渲染的图片
 *   - 标记 data-no-protect="1" 可手动跳过遮罩保护
 *
 * 依赖：无（纯原生 JS，兼容 file:// 与 GitHub Pages）
 */
(function () {
    'use strict';

    /* 跳过 overlay 遮罩的图片选择器（仍会添加 draggable=false 和全局事件监听） */
    var SKIP_OVERLAY_SELECTOR = [
        'a img',                       // 链接中的图片（保留点击跳转）
        '.gallery-thumb-item img',     // 缩略图（保留 onclick 切换主图）
        '.gallery-main-wrapper img',   // 主图（minimap 滚动交互需要）
        '.gallery-minimap img',        // minimap 小地图（拖拽交互需要）
        '.lightbox img',               // 灯箱大图（已有自定义交互）
        '.qrcode-img',                 // 二维码（保留长按识别）
        '.footer-qrcode img',
        '[data-no-protect="1"]'
    ].join(',');

    function shouldSkipOverlay(img) {
        try {
            return img.matches(SKIP_OVERLAY_SELECTOR) ||
                   img.getAttribute('data-no-protect') === '1';
        } catch (e) {
            return false;
        }
    }

    /* 判断父容器是否只包含该 <img> 一个可见元素节点（避免误伤兄弟元素） */
    function isOnlyChildElement(img, parent) {
        var children = parent.children;
        for (var i = 0; i < children.length; i++) {
            var c = children[i];
            if (c === img) continue;
            var tag = c.tagName;
            // 忽略 script/style/link 等非视觉元素
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK') continue;
            return false;
        }
        return true;
    }

    /* 检测图片是否响应式（width / max-width 为百分比），决定 wrap 是否需要撑满 */
    function isFluidImage(img) {
        try {
            var cs = getComputedStyle(img);
            var w = cs.width;
            var mw = cs.maxWidth;
            if (w && w.indexOf('%') >= 0) return true;
            if (mw && mw.indexOf('%') >= 0) return true;
            // width:100% 像素计算后可能返回像素值，再检查 style 属性
            var styleW = img.style.width;
            if (styleW && styleW.indexOf('%') >= 0) return true;
        } catch (e) {}
        return false;
    }

    function protectImage(img) {
        if (!img || img.tagName !== 'IMG') return;
        if (img.dataset.ipProtected === '1') return;

        // 三重保险之一：HTML 属性 draggable=false
        img.draggable = false;
        img.setAttribute('draggable', 'false');
        img.dataset.ipProtected = '1';

        // 跳过遮罩保护的图片，仅保留 draggable=false 和全局事件监听
        if (shouldSkipOverlay(img)) return;

        var parent = img.parentElement;
        if (!parent) return;

        // 父容器有其他可见元素时跳过 overlay，避免误伤点击
        if (!isOnlyChildElement(img, parent)) return;

        // 确保父容器 position:relative（用于 overlay 绝对定位）
        var pos;
        try { pos = getComputedStyle(parent).position; } catch (e) { pos = 'static'; }
        if (pos === 'static' || pos === '') {
            parent.classList.add('img-protect-host');
        }

        // 插入透明遮罩
        var overlay = document.createElement('div');
        overlay.className = 'img-protect-overlay';
        // 行内属性绑定（双保险，确保即使事件监听器失效也能拦截）
        overlay.setAttribute('ondragstart', 'return false;');
        overlay.setAttribute('oncontextmenu', 'return false;');
        parent.appendChild(overlay);
    }

    function scanAll(root) {
        try {
            var imgs = (root || document).querySelectorAll('img:not([data-ip-protected="1"])');
            for (var i = 0; i < imgs.length; i++) {
                protectImage(imgs[i]);
            }
        } catch (e) {}
    }

    /* ===== 全局事件监听（事件委托，覆盖动态生成的图片） ===== */

    // 全局禁止右键菜单：针对 IMG 和 .img-protect-overlay
    document.addEventListener('contextmenu', function (e) {
        var t = e.target;
        if (!t) return;
        if (t.tagName === 'IMG') {
            e.preventDefault();
            return;
        }
        if (t.classList && t.classList.contains('img-protect-overlay')) {
            e.preventDefault();
        }
    });

    // 全局禁止拖拽：target 为 IMG 时阻止
    document.addEventListener('dragstart', function (e) {
        if (e.target && e.target.tagName === 'IMG') {
            e.preventDefault();
        }
    });

    /* ===== 初始化 ===== */
    function init() {
        scanAll(document);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM 已就绪（defer 或异步加载场景）
        init();
    }

    /* ===== MutationObserver：处理 JS 动态渲染的图片 ===== */
    if (window.MutationObserver) {
        var observer = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var added = mutations[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var node = added[j];
                    if (node.nodeType !== 1) continue;
                    if (node.tagName === 'IMG') {
                        protectImage(node);
                    } else if (node.querySelectorAll) {
                        scanAll(node);
                    }
                }
            }
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }
})();
