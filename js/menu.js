function initScrollEffects() {
    handleNavScroll(); // 初始化状态
    window.addEventListener('scroll', handleNavScroll);
}

document.addEventListener('DOMContentLoaded', initScrollEffects);

function initMobileMenu() {
    console.log('开始移动菜单初始化');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    
    // 添加视觉反馈样式
    if (menuBtn) {
        menuBtn.style.transition = 'all 0.3s ease';
        menuBtn.style.backgroundColor = 'rgba(255, 51, 102, 0.2)';
    }

    
    console.log('菜单元素检测:', { menuBtnExists: !!menuBtn, navLinksExists: !!navLinks });
    
    // 增强元素检测
    if (!menuBtn || !navLinks) {
        console.error('菜单元素缺失:', { menuBtn, navLinks });
        return;
    }

    // 实时检测移动端状态
    const mobileCheck = () => window.matchMedia('(max-width: 768px)').matches;
    const isMobile = mobileCheck();
    console.log('移动端检测结果:', isMobile);
    if (!isMobile) {
        console.log('非移动端环境，跳过菜单初始化');
        return;
    }

    // 强制显示移动菜单按钮
    menuBtn.style.display = 'block';
    menuBtn.style.zIndex = '1002';

    // 切换菜单状态
    const toggleMenu = (show) => {
        navLinks.classList.toggle('active', show);
        document.body.classList.toggle('no-scroll', show);
        menuBtn.querySelector('i').classList.toggle('fa-times', show);
        console.log('菜单状态变化:', { show, hasActiveClass: navLinks.classList.contains('active'), classList: navLinks.classList.toString() });
    };

    // 点击菜单按钮
    menuBtn.addEventListener('click', (e) => {
        console.log('菜单按钮点击事件触发');
        // 添加点击视觉反馈
        menuBtn.style.transform = 'scale(0.95)';
        setTimeout(() => menuBtn.style.transform = 'scale(1)', 200);
        console.log('菜单按钮点击事件触发');
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

    console.log('移动菜单初始化成功');
}

function handleNavScroll() {
    const navContainer = document.querySelector('.nav-container');
    if (!navContainer) {
        console.error('导航栏元素未找到');
        return;
    }
    console.log('滚动位置:', window.scrollY);
    if (window.scrollY > 5) {
        navContainer.classList.add('scrolled');
        console.log('已添加scrolled类');
    } else {
        navContainer.classList.remove('scrolled');
        console.log('已移除scrolled类');
    }
}

function initScrollEffects() {
    handleNavScroll(); // 初始化状态
    window.addEventListener('scroll', handleNavScroll);
}

document.addEventListener('DOMContentLoaded', () => {
    initScrollEffects();
    initMobileMenu();
});