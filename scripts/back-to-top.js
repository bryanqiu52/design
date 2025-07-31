// 回到顶部按钮功能实现

// 创建回到顶部按钮元素
function createBackToTopButton() {
    const button = document.createElement('button');
    button.classList.add('back-to-top');
    button.innerHTML = '<i class="fas fa-arrow-up"></i>';
    button.setAttribute('aria-label', '回到顶部');
    document.body.appendChild(button);
    return button;
}

// 初始化回到顶部按钮
function initBackToTopButton() {
    const backToTopButton = createBackToTopButton();

    // 监听滚动事件，控制按钮显示/隐藏
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTopButton.classList.add('visible');
        } else {
            backToTopButton.classList.remove('visible');
        }
    });

    // 点击按钮回到顶部
    backToTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initBackToTopButton);