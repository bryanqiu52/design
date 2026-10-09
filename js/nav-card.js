/* 案例详情页底部「上一个 / 返回案例 / 下一个」导航卡的吸附逻辑
 *
 * 行为（与 project.html 的 initNavCardScroll 保持一致）：
 *   1. 默认 position:fixed 悬浮在视口底部，跟着页面滚动
 *   2. 滚到锚点（.project-nav-anchor，即正文末尾）附近时，加 .fixed-at-anchor
 *      切成 absolute 落回文档流，不再挡着页脚和「其他案例」
 *
 * 依赖 DOM：.project-nav-card 和 .project-nav-anchor 两个元素同时存在才生效
 */
(function () {
    function init() {
        var navCard = document.querySelector('.project-nav-card');
        var anchor = document.querySelector('.project-nav-anchor');
        if (!navCard || !anchor) return;

        /* 移动端不做浮窗，保持文档流展示，避免遮挡内容 */
        if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) return;

        function update() {
            var anchorOffsetTop = anchor.offsetTop;
            var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop >= anchorOffsetTop - 800) {
                navCard.classList.add('fixed-at-anchor');
            } else {
                navCard.classList.remove('fixed-at-anchor');
            }
        }

        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update, { passive: true });
        update();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
