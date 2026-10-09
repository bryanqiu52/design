/* 「其他案例」横向滚动：左右箭头翻页
 *
 * 箭头常显，不按内容隐藏（与 project.html 的 scrollCases 行为一致）。
 *
 * 两个实现注意点：
 *   1. 溢出量不用 scrollWidth —— .cases-list 是 overflow:visible，
 *      而规范里 scrollWidth 只对滚动盒有保证。改用最后一张卡片的右边界来算。
 *   2. 不缓存按钮引用 —— 页面上别的脚本可能重写这块 DOM，缓存下来的节点会失效。
 */
(function () {
    var pos = 0;
    var bound = false;

    function els() {
        return {
            container: document.getElementById('casesScrollContainer'),
            list: document.getElementById('casesList'),
            prev: document.querySelector('.cases-prev-btn'),
            next: document.querySelector('.cases-next-btn')
        };
    }

    /* 内容宽度 = 最后一张卡片的右边缘
       .cases-scroll-container 是 position:relative，即卡片的 offsetParent，
       所以 offsetLeft 相对容器左边缘，可以直接和 clientWidth 比 */
    function contentWidth(e) {
        var items = e.list ? e.list.querySelectorAll('.case-item') : [];
        if (!items.length) return 0;
        var last = items[items.length - 1];
        return last.offsetLeft + last.offsetWidth;
    }

    function maxScroll(e) {
        if (!e.container || !e.list) return 0;
        return Math.max(0, contentWidth(e) - e.container.clientWidth);
    }

    function step(e) {
        var item = e.list ? e.list.querySelector('.case-item') : null;
        /* 卡片宽度 + gap(1.5rem=24px)；取不到就退回 project.html 里的 280 */
        return item ? (item.offsetWidth + 24) : 280;
    }

    function apply() {
        var e = els();
        if (!e.container || !e.list) return;
        var max = maxScroll(e);
        /* 夹在合法范围内，滚到两端再点就不动了 */
        pos = Math.max(0, Math.min(max, pos));
        e.list.style.transform = 'translateX(-' + pos + 'px)';
    }

    function bindOnce() {
        if (bound) return;
        var e = els();
        if (!e.container || !e.list) return;
        bound = true;

        if (e.prev) {
            e.prev.addEventListener('click', function () {
                var cur = els();
                pos -= step(cur);
                apply();
            });
        }
        if (e.next) {
            e.next.addEventListener('click', function () {
                var cur = els();
                pos += step(cur);
                apply();
            });
        }
        window.addEventListener('resize', apply);
    }

    function tick() {
        bindOnce();
        apply();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tick);
    } else {
        tick();
    }
    /* load 时图片/字体就位，布局可能变了，再校一次 */
    window.addEventListener('load', tick);
})();
