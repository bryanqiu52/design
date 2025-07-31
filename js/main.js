// 添加滚动监听显示动画
function handleScrollAnimations() {
    const fadeElements = document.querySelectorAll('.fade-in-section');
    fadeElements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 50; // 降低触发阈值
        if (elementTop < window.innerHeight - elementVisible) {
            element.classList.add('is-visible');
        }
    });
}

// 使用requestAnimationFrame确保DOM加载完成后执行
window.addEventListener('scroll', handleScrollAnimations);
window.addEventListener('load', () => {
    requestAnimationFrame(handleScrollAnimations);
});

// 确保DOM加载完成后再绑定测试按钮事件
document.addEventListener('DOMContentLoaded', function() {
    const testModalBtn = document.getElementById('testModalBtn');
    if (testModalBtn) {
        testModalBtn.addEventListener('click', function() {
            // 使用main.js中的openModal函数打开第一个项目
            if (window.projects && window.projects.length > 0 && typeof openModal === 'function') {
                openModal(window.projects[0]);
            } else {
                console.error('项目数据未加载或openModal函数未定义');
            }
        });
    }

    // 加载作品数据
    loadWorks();

    // 初始化筛选功能
    initFilters();
});

// 获取分类中文名称
function getCategoryName(category) {
    const categories = {
        'branding': '品牌设计',
        'ui': 'UI设计',
        'packaging': '包装设计',
        'dianshang': '电商设计',
        'all': '全部作品'
    };
    return categories[category] || category;
}

// 初始化筛选功能
function initFilters() {
    const filterButtons = document.querySelectorAll('.filter-controls button');
    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            // 获取按钮上的data-category属性，如果没有则使用按钮文本
            const category = button.dataset.category || button.textContent.trim().toLowerCase();
            filterWorks('all');
            button.addEventListener('click', function() {
                filterWorks(category);
                // 更新按钮激活状态
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
            });
        });
        // 初始显示所有作品
        filterButtons[0].classList.add('active');
    }
}

// 筛选作品
function filterWorks(category) {
    console.log('筛选类别:', category);
    const workCards = document.querySelectorAll('.work-card');
    workCards.forEach(card => {
        const cardCategory = card.dataset.category;
        console.log('作品类别:', cardCategory);
        const shouldShow = category === 'all' || cardCategory === category;
        card.classList.toggle('hidden', !shouldShow);
    });
}

let currentWorkIndex = -1;
const allWorks = [];

// 加载作品数据
function loadWorks() {
    console.log('开始加载作品数据');
    try {
        const scriptTag = document.querySelector('script[type="application/json"]#works-data');
        if (!scriptTag) {
            console.error('未找到作品数据脚本标签');
            return;
        }

        const data = JSON.parse(scriptTag.textContent);
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.error('作品数据格式不正确或为空:', data);
            return;
        }

        allWorks.length = 0;
        allWorks.push(...data);
        window.projects = data;

        const container = document.getElementById('portfolioContainer');
        if (!container) {
            console.error('未找到作品容器元素');
            return;
        }

        container.innerHTML = '';

        // 动态生成作品卡片
        data.forEach((work, index) => {
            // 确保作品有ID
            if (!work.id) {
                work.id = index + 1; // 为没有ID的作品分配一个基于索引的ID
            }

            const card = document.createElement('div');
            card.className = 'work-card';
            card.dataset.category = work.category;
            card.dataset.index = index;
            card.dataset.projectId = work.id;

            // 确保图片路径正确
            const imagePath = work.image ? `images/${work.image}` : 'images/default.png';

            card.innerHTML = `
                <img src="${imagePath}" alt="${work.title || '作品图片'}">
                <div class="work-card-content">
                    <div class="work-header">
                        <h3>${work.title || '未命名作品'}</h3>
                        <span class="category">${getCategoryName(work.category) || '未分类'}</span>
                    </div>
                    <p>${work.description || '暂无作品描述'}</p>
                </div>
            `;

            container.appendChild(card);
            console.log('成功添加作品卡片:', work.title);
            // 添加点击事件以跳转到作品详情页
            card.addEventListener('click', () => {
                window.location.href = `work-detail.html?id=${work.id}`;
            });
        });
    } catch (error) {
        console.error('加载作品数据失败:', error);
    }
}

// 打开项目详情模态框
function openModal(project) {
    const modal = document.getElementById('projectModal');
    if (!modal) {
        console.error('未找到模态框元素');
        return;
    }

    // 获取模态框中的元素
    const modalTitle = document.getElementById('modalTitle');
    const modalClient = document.getElementById('modalClient');
    const modalServices = document.getElementById('modalServices');
    const modalDate = document.getElementById('modalDate');
    const modalDescription = document.getElementById('modalDescription');
    const mainImage = document.getElementById('mainImage');
    const thumbnailList = document.getElementById('thumbnailList');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');

    // 设置模态窗口内容
    modalTitle.textContent = project.title || '未命名项目';
    modalClient.textContent = project.client || '客户名称';
    modalServices.textContent = project.service || '服务内容';
    modalDate.textContent = project.date || '日期';
    modalDescription.textContent = project.overview || project.description || '项目概述';

    // 初始化轮播图数据
    const gallery = project.gallery && Array.isArray(project.gallery) && project.gallery.length ? 
        project.gallery.map(img => `images/${img}`) : 
        [project.image ? `images/${project.image}` : 'images/default.png'];
    let currentIndex = 0;

    // 更新主图
    function updateMainImage(index) {
        mainImage.src = gallery[index];
        mainImage.alt = project.title || '项目图片';
        // 更新缩略图激活状态
        document.querySelectorAll('.thumbnail-item').forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
    }

    // 清空并填充缩略图列表
    thumbnailList.innerHTML = '';
    gallery.forEach((img, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = `thumbnail-item ${index === currentIndex ? 'active' : ''}`;
        thumbnail.innerHTML = `<img src="${img}" alt="${project.title || '项目缩略图'}">`;
        thumbnail.addEventListener('click', () => {
            currentIndex = index;
            updateMainImage(currentIndex);
        });
        thumbnailList.appendChild(thumbnail);
    });

    // 初始化显示第一张图片
    updateMainImage(currentIndex);

    // 前后导航按钮事件
    prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + gallery.length) % gallery.length;
        updateMainImage(currentIndex);
    });

    nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % gallery.length;
        updateMainImage(currentIndex);
    });

    // 显示模态框
    modal.style.display = 'block';
    // 添加动画效果
    setTimeout(() => {
        modal.querySelector('.modal-content').style.opacity = '1';
    }, 10);

    // 关闭按钮事件
    const closeBtn = modal.querySelector('.modal-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // 点击模态框外部关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // 键盘ESC关闭
    document.addEventListener('keydown', function handleEsc(e) {
        if (e.key === 'Escape') {
            modal.style.display = 'none';
            document.removeEventListener('keydown', handleEsc);
        }
    });
}

// 关闭模态框
function closeModal() {
    const modal = document.getElementById('projectModal');
    if (modal) {
        modal.style.display = 'none';
    }
}
