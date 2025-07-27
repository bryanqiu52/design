<<<<<<< HEAD
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    // 增强元素检测
    if (!menuBtn || !navLinks) {
        console.error('菜单元素缺失:', { menuBtn, navLinks });
        return;
    }

    // 实时检测移动端状态
    const mobileCheck = () => window.matchMedia('(max-width: 768px)').matches;
    if (!mobileCheck()) {
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
        console.log('菜单状态:', show ? '打开' : '关闭');
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

    console.log('移动菜单初始化成功');
}

=======
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    // 增强元素检测
    if (!menuBtn || !navLinks) {
        console.error('菜单元素缺失:', { menuBtn, navLinks });
        return;
    }

    // 实时检测移动端状态
    const mobileCheck = () => window.matchMedia('(max-width: 768px)').matches;
    if (!mobileCheck()) {
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
        console.log('菜单状态:', show ? '打开' : '关闭');
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

    console.log('移动菜单初始化成功');
}

>>>>>>> 0661f59ed661215ca6d05f7ac4a4cdcf145a0048
document.addEventListener('DOMContentLoaded', initMobileMenu); 