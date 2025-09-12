// detail.js - 作品详情页逻辑

// 确保数据加载完成后执行
function initProjectDetail() {
    // 从URL获取作品ID
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        console.error('未提供作品ID');
        // 显示错误信息给用户
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-message';
        errorContainer.textContent = '未找到指定的作品。请从作品集页面选择一个作品查看详情。';
        errorContainer.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 20px; background-color: #ff4d4f; color: white; border-radius: 4px; z-index: 1000;';
        document.body.appendChild(errorContainer);
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

// 创建图片查看器模态框
function createImageViewer() {
    // 检查是否已存在模态框
    let modal = document.getElementById('imageViewer');

    if (!modal) {
        // 创建模态框元素
        modal = document.createElement('div');
        modal.id = 'imageViewer';
        modal.className = 'image-viewer-modal';
        modal.style.display = 'none';

        // 创建关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.addEventListener('click', () => modal.style.display = 'none');

        // 创建导航按钮
        const prevBtn = document.createElement('button');
        prevBtn.className = 'nav-btn prev';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';

        const nextBtn = document.createElement('button');
        nextBtn.className = 'nav-btn next';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';

        // 创建图片容器
        const imgContainer = document.createElement('div');
        imgContainer.className = 'image-container';

        // 创建图片元素
        const modalImg = document.createElement('img');
        modalImg.id = 'modalImage';
        modalImg.className = 'modal-image';

        // 组装模态框
        imgContainer.appendChild(modalImg);
        modal.appendChild(closeBtn);
        modal.appendChild(prevBtn);
        modal.appendChild(nextBtn);
        modal.appendChild(imgContainer);

        // 添加到文档
        document.body.appendChild(modal);
    }

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .image-viewer-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .close-btn {
            position: absolute;
            top: 20px;
            right: 30px;
            color: #f1f1f1;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
            background: transparent;
            border: none;
        }
        .nav-btn {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: transparent;
            border: none;
            color: white;
            font-size: 30px;
            cursor: pointer;
            padding: 10px;
        }
        .prev {
            left: 20px;
        }
        .next {
            right: 20px;
        }
        .image-container {
            max-width: 90%;
            max-height: 90%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .modal-image {
            max-width: 100%;
            max-height: 90vh;
            object-fit: contain;
        }
    `;
    document.head.appendChild(style);

    return modal;
}

// 显示大图
function showLargeImage(imageUrl, imagesArray, currentIndex) {
    const modal = createImageViewer();
    // 确保modal存在
    if (!modal) {
        console.error('Modal not found or created');
        return;
    }
    // 直接从modal中查找图片元素，而不是通过document.getElementById
    const modalImg = modal.querySelector('#modalImage');
    const prevBtn = modal.querySelector('.nav-btn.prev');
    const nextBtn = modal.querySelector('.nav-btn.next');

    if (!modalImg || !prevBtn || !nextBtn) {
        console.error('One or more modal elements not found');
        return;
    }

    modalImg.src = imageUrl;
    modal.style.display = 'flex';

    // 更新导航按钮状态
    prevBtn.style.display = imagesArray.length > 1 ? 'block' : 'none';
    nextBtn.style.display = imagesArray.length > 1 ? 'block' : 'none';

    // 添加导航功能
    prevBtn.onclick = () => {
        currentIndex = (currentIndex - 1 + imagesArray.length) % imagesArray.length;
        modalImg.src = imagesArray[currentIndex];
    };

    nextBtn.onclick = () => {
        currentIndex = (currentIndex + 1) % imagesArray.length;
        modalImg.src = imagesArray[currentIndex];
    };

    // 点击模态框背景关闭
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };

    // 键盘导航
    document.onkeydown = (e) => {
        if (modal.style.display === 'flex') {
            if (e.key === 'Escape') {
                modal.style.display = 'none';
            } else if (e.key === 'ArrowLeft') {
                currentIndex = (currentIndex - 1 + imagesArray.length) % imagesArray.length;
                modalImg.src = imagesArray[currentIndex];
            } else if (e.key === 'ArrowRight') {
                currentIndex = (currentIndex + 1) % imagesArray.length;
                modalImg.src = imagesArray[currentIndex];
            }
        }
    };
}

// 渲染作品详情
function renderProjectDetails(project) {
    if (!project) return;

    // 设置页面标题
    document.title = project.title + ' | Design BRYAN';

    // 设置顶部Banner背景图
    const detailBanner = document.getElementById('detailBanner');
    const projectTitle = document.getElementById('projectTitle');
    // 确保图片路径正确
    // 所有图片都在images目录下，确保路径正确
    const mainImageUrl = project.cover_image ? 
        (project.cover_image.startsWith('images/') ? `${project.cover_image}` : `images/${project.cover_image}`) : 
        'images/default.png';
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
    // 确保图片路径正确
    const gallery = project.images && Array.isArray(project.images) && project.images.length ? 
        project.images.map(img => 
            (img.startsWith('images/') ? `${img}` : `images/${img}`) 
        ) : 
        [project.cover_image ? 
            (project.cover_image.startsWith('images/') ? `${project.cover_image}` : `images/${project.cover_image}`) : 
            'images/default.png'];
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

    // 为图片添加点击事件以查看大图
    mainImage.addEventListener('click', () => {
        showLargeImage(mainImage.src, gallery, currentIndex);
    });

    // 确保thumbnailList元素存在
    if (!thumbnailList) {
        console.error('thumbnailList元素不存在');
        return;
    }

    // 清空并填充缩略图列表
    thumbnailList.innerHTML = '';
    gallery.forEach((img, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = `thumbnail-item ${index === currentIndex ? 'active' : ''}`;
        
        const imgElement = document.createElement('img');
        imgElement.src = img;
        imgElement.alt = project.title || '项目缩略图';
        imgElement.className = 'thumbnail-image';
        
        // 为缩略图容器添加点击事件 - 切换主图
        thumbnail.addEventListener('click', () => {
            currentIndex = index;
            updateMainImage(currentIndex);
        });
        
        // 为缩略图图片添加点击事件 - 查看大图
        imgElement.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止触发父元素的点击事件
            showLargeImage(img, gallery, index);
        });
        
        thumbnail.appendChild(imgElement);
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

            const imagePath = work.cover_image ? `images/${work.cover_image}` : 'images/default.png';
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