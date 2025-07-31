function handleNavScroll() {
    const navContainer = document.querySelector('.nav-container');
    if (!navContainer) return;
    if (window.scrollY > 5) {
        navContainer.classList.add('scrolled');
    } else {
        navContainer.classList.remove('scrolled');
    }
}

function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (!menuBtn || !navLinks) return;

    // 检测移动端状态
    const mobileCheck = () => window.matchMedia('(max-width: 768px)').matches;
    const isMobile = mobileCheck();
    if (!isMobile) return;

    // 切换菜单状态
    const toggleMenu = (show) => {
        navLinks.classList.toggle('active', show);
        document.body.classList.toggle('no-scroll', show);
        const icon = menuBtn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-times', show);
            icon.classList.toggle('fa-bars', !show);
        }
    };

    // 点击菜单按钮
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu(!navLinks.classList.contains('active'));
    });

    // 点击外部区域
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-container')) {
            toggleMenu(false);
        }
    });

    // 窗口尺寸变化
    window.addEventListener('resize', () => {
        if (!mobileCheck()) toggleMenu(false);
    });
}

// 确保DOM完全加载后执行
window.addEventListener('DOMContentLoaded', () => {
    // 初始化滚动效果
    handleNavScroll();
    window.addEventListener('scroll', handleNavScroll);
    
    // 初始化移动菜单
    initMobileMenu();
});