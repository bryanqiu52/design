// detail.js - 作品详情页逻辑

// 确保数据加载完成后执行
function initProjectDetail() {
    // 从URL获取作品ID
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        console.error('未提供作品ID');
        return;
    }

    // 加载作品数据
    loadProjectData(projectId);
}

// 监听数据加载完成事件
document.addEventListener('dataLoaded', initProjectDetail);

// 如果DOM已加载且数据已存在，直接初始化
if (document.readyState === 'complete' && document.querySelector('script[type="application/json"]#works-data')) {
    initProjectDetail();
}

// 加载作品数据
function loadProjectData(projectId) {
    try {
        // 从当前页面获取数据
        const scriptTag = document.querySelector('script[type="application/json"]#works-data');
        if (!scriptTag) {
            console.error('未找到作品数据脚本标签');
            return;
        }

        const data = JSON.parse(scriptTag.textContent);
        if (!data || !Array.isArray(data.works)) {
            console.error('作品数据格式不正确:', data);
            return;
        }

        // 渲染作品详情
        const project = findProjectById(data.works, projectId);
        if (project) {
            renderProjectDetails(project);
        } else {
            console.error('未找到ID为' + projectId + '的作品');
        }
    } catch (error) {
        console.error('加载作品数据失败:', error);
    }
}

// 根据ID查找作品
function findProjectById(projects, id) {
    return projects.find(project => project.id && project.id.toString() === id.toString());
}

// 渲染作品详情
function renderProjectDetails(project) {
    if (!project) return;

    // 设置页面标题
    document.title = project.title + ' | Design BRYAN';

    // 设置顶部Banner背景图
    const detailBanner = document.getElementById('detailBanner');
    const projectTitle = document.getElementById('projectTitle');
    const mainImageUrl = project.image ? `images/${project.image}` : 'images/default.png';
    detailBanner.style.backgroundImage = `url('${mainImageUrl}')`;
    projectTitle.textContent = project.title || '未命名项目';

    // 获取页面元素
    const projectClient = document.getElementById('projectClient');
    const projectServices = document.getElementById('projectServices');
    const projectDate = document.getElementById('projectDate');
    const projectYear = document.getElementById('projectYear');
    const projectDescription = document.getElementById('projectDescription');
    const mainImage = document.getElementById('mainImage');
    const thumbnailList = document.getElementById('thumbnailList');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');

    // 加载推荐作品
    loadRelatedWorks(project.id);

    // 设置项目信息
    projectTitle.textContent = project.title || '未命名项目';
    projectClient.textContent = project.client || '客户名称';
    projectServices.textContent = project.service || '服务内容';
    projectDate.textContent = project.date || '日期';
    projectYear.textContent = project.year || '年份';
    projectDescription.textContent = project.overview || project.description || '项目概述';

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

    // 键盘导航
    document.addEventListener('keydown', function handleKeys(e) {
        if (e.key === 'ArrowLeft') {
            currentIndex = (currentIndex - 1 + gallery.length) % gallery.length;
            updateMainImage(currentIndex);
        } else if (e.key === 'ArrowRight') {
            currentIndex = (currentIndex + 1) % gallery.length;
            updateMainImage(currentIndex);
        }
    });
}

// 加载推荐作品
function loadRelatedWorks(currentProjectId) {
    try {
        const scriptTag = document.querySelector('script[type="application/json"]#works-data');
        if (!scriptTag) {
            console.error('未找到作品数据脚本标签');
            return;
        }

        const data = JSON.parse(scriptTag.textContent);
        if (!data || !Array.isArray(data.works) || data.works.length === 0) {
            console.error('作品数据格式不正确或为空:', data);
            return;
        }

        // 过滤掉当前作品，并随机选择最多4个
        const relatedWorks = data.works
            .filter(work => work.id && work.id !== currentProjectId)
            .sort(() => 0.5 - Math.random())
            .slice(0, 4);

        const relatedWorksGrid = document.getElementById('relatedWorksGrid');
        if (!relatedWorksGrid) {
            console.error('未找到推荐作品容器');
            return;
        }

        relatedWorksGrid.innerHTML = '';

        // 生成推荐作品卡片
        relatedWorks.forEach(work => {
            const card = document.createElement('div');
            card.className = 'related-work-card';

            const imagePath = work.image ? `images/${work.image}` : 'images/default.png';
            const categoryName = getCategoryName(work.category) || '未分类';

            card.innerHTML = `
                <img src="${imagePath}" alt="${work.title || '作品图片'}">
                <div class="related-work-info">
                    <h3 class="related-work-title">${work.title || '未命名作品'}</h3>
                    <span class="related-work-category">${categoryName}</span>
                </div>
            `;

            // 添加点击事件
            card.addEventListener('click', () => {
                window.location.href = `work-detail.html?id=${work.id}`;
            });

            relatedWorksGrid.appendChild(card);
        });
    } catch (error) {
        console.error('加载推荐作品失败:', error);
    }
}

// 获取分类中文名称
function getCategoryName(category) {
    const categories = {
        'branding': '品牌设计',
        'ui': 'UI/UX设计',
        'packaging': '包装设计',
        'dianshang': '电商设计',
        'all': '全部作品'
    };
    return categories[category] || category;
}

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

window.addEventListener('scroll', handleScrollAnimations);
window.addEventListener('load', () => {
    requestAnimationFrame(handleScrollAnimations);
});