// 作品筛选功能修复

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 初始化筛选功能
    initFilters();
});

// 初始化筛选功能
function initFilters() {
    const filterButtons = document.querySelectorAll('.filter-controls button');
    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            // 获取按钮上的data-category属性，如果没有则使用按钮文本
            const category = button.dataset.category || button.textContent.trim().toLowerCase();
            button.addEventListener('click', function() {
                filterWorks(category);
                // 更新按钮激活状态
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
            });
        });
        // 初始显示所有作品
        filterButtons[0].classList.add('active');
        // 页面加载完成后默认筛选所有作品
        filterWorks('all');
    }
}

// 筛选作品 - 完全重写版本
function filterWorks(category) {
    console.log('筛选类别:', category);
    const workCards = document.querySelectorAll('.work-card');
    const portfolioGrid = document.querySelector('.portfolio-grid');
    let hasVisibleCards = false;

    // 先隐藏所有卡片
    workCards.forEach(card => {
        card.classList.add('hidden');
        card.style.display = 'none';
        card.style.height = '0';
        card.style.width = '0';
        card.style.margin = '0';
        card.style.padding = '0';
        card.style.border = 'none';
        card.style.opacity = '0';
        card.style.overflow = 'hidden';
    });

    // 然后显示符合条件的卡片
    workCards.forEach(card => {
        const cardCategory = card.dataset.category;
        console.log('作品类别:', cardCategory);
        const shouldShow = category === 'all' || cardCategory === category;

        if (shouldShow) {
            card.classList.remove('hidden');
            card.style.display = 'block';
            card.style.height = 'auto';
            card.style.width = '100%';
            card.style.margin = '0';
            card.style.padding = '0';
            card.style.border = '';
            card.style.opacity = '1';
            card.style.overflow = 'hidden';
            hasVisibleCards = true;
        }
    });

    // 如果没有可见卡片，显示提示信息
    if (!hasVisibleCards) {
        // 检查是否已存在提示元素
        let noResults = document.querySelector('.no-results');
        if (!noResults) {
            noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.style.textAlign = 'center';
            noResults.style.padding = '2rem';
            noResults.style.width = '100%';
            portfolioGrid.appendChild(noResults);
        }
        noResults.textContent = '没有找到匹配的作品';
    } else {
        // 如果有可见卡片，移除提示信息
        const noResults = document.querySelector('.no-results');
        if (noResults) {
            noResults.remove();
        }
    }

    // 强制重排布局
    forceReflow(portfolioGrid);
}

// 强制元素重绘和重排
function forceReflow(element) {
    if (!element) return;

    // 方法1: 改变opacity触发重绘
    element.style.opacity = '0.99';
    setTimeout(() => {
        element.style.opacity = '1';
    }, 50);

    // 方法2: 改变transform触发重排
    setTimeout(() => {
        element.style.transform = 'translateZ(0)';
        setTimeout(() => {
            element.style.transform = '';
        }, 50);
    }, 100);
}