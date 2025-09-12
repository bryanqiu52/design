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

// 确保DOM加载完成后再执行初始化
// 确保DataService加载完成后再执行初始化
function initApp() {
  if (window.DataService) {
    console.log('DataService已加载，开始初始化应用...');
    initApplication();
  } else {
    console.log('DataService尚未加载，等待100ms后重试...');
    setTimeout(initApp, 100);
  }
}

// 应用初始化函数
async function initApplication() {
    // 绑定测试按钮事件
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

    // 初始化数据服务并加载作品
    console.log('开始初始化数据服务...');
    try {
      // 初始化数据服务
      await DataService.init();
      console.log('数据服务初始化成功');

      // 加载作品数据
      loadWorks();

      // 加载并应用网站设置
      applySiteSettings();

      // 加载并应用个人信息
      applyProfileInfo();
    } catch (error) {
      console.error('初始化失败:', error);
      // 显示错误信息
      showError('加载数据失败: ' + error.message);
    }
  }

  // 调用初始化函数
  initApp();

// 修改loadWorks函数，使用数据服务加载作品数据
function loadWorks() {
    console.log('开始加载作品数据');
    try {
        console.log('DataService:', DataService);
        const data = DataService.getWorks();
        console.log('获取到的作品数据:', data);
        // 检查数据格式，如果是对象且包含works数组，则使用works数组
        const worksData = data && data.works && Array.isArray(data.works) ? data.works : data;
        if (!worksData || !Array.isArray(worksData) || worksData.length === 0) {
            console.error('作品数据格式不正确或为空:', data);
            return;
        }
        console.log('作品数量:', worksData.length);

        allWorks.length = 0;
        allWorks.push(...worksData);
        window.projects = worksData;

        const container = document.getElementById('portfolioContainer');
        if (!container) {
            console.error('未找到作品容器元素');
            return;
        }

        container.innerHTML = '';

        // 动态生成作品卡片
        worksData.forEach((work, index) => {
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
            // 如果cover_image不包含路径，则根据作品ID添加正确的路径前缀
            let imagePath;
            if (work.cover_image) {
                if (work.cover_image.includes('/')) {
                    // 如果已经包含路径，则直接使用
                    imagePath = work.cover_image.startsWith('images/') ? work.cover_image : `images/${work.cover_image}`;
                } else {
                    // 如果不包含路径，则根据作品ID添加路径前缀
                    const workId = work.id || (index + 1);
                    imagePath = `images/works/${workId}/${work.cover_image}`;
                }
            } else {
                imagePath = 'images/default.png';
            }
            console.log('作品图片路径:', imagePath);

            card.innerHTML = `
                <div class="work-image-container">
                    <img src="${imagePath}" alt="${work.title || '作品图片'}">
                    <span class="category-badge">${getCategoryName(work.category) || '未分类'}</span>
                </div>
                <div class="work-card-content">
                    <h3>${work.title || '未命名作品'}</h3>
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

        // 作品卡片生成后初始化筛选功能
        initFilters();
    } catch (error) {
        console.error('加载作品数据失败:', error);
    }
}

// 应用网站设置到页面
function applySiteSettings() {
    const settings = DataService.getSettings();
    if (!settings || !settings.site) return;

    // 设置网站标题
    document.title = settings.site.title || document.title;

    // 设置网站Logo
    const logo = document.getElementById('site-logo');
    if (logo) {
        logo.textContent = settings.site.title ? settings.site.title.split(' ')[0] : logo.textContent;
    }
}

// 应用个人信息到页面
function applyProfileInfo() {
    const profile = DataService.getProfile();
    if (!profile) return;

    // 设置社交媒体链接
    const socialLinks = document.querySelectorAll('.social-links a');
    socialLinks.forEach(link => {
        const platform = link.ariaLabel.toLowerCase();
        if (profile.social && profile.social[platform]) {
            link.href = profile.social[platform];
        }
    });

    // 设置联系信息
    const footerInfo = document.querySelector('.footer-info');
    if (footerInfo) {
        const emailElement = footerInfo.querySelector('p:nth-child(2)');
        if (emailElement && profile.contact && profile.contact.email) {
            emailElement.textContent = profile.contact.email;
        }
    }
}

// 根据gallery.json中的分类配置获取分类名称
function getCategoryName(category) {
    const gallery = DataService.getGallery();
    if (gallery && gallery.categories) {
        const cat = gallery.categories.find(c => c.id === category);
        if (cat) return cat.name;
    }

    // 后备分类映射
    const defaultCategories = {
        'branding': '品牌设计',
        'ui': 'UI设计',
        'packaging': '包装设计',
        'dianshang': '电商设计',
        'all': '全部作品'
    };
    return defaultCategories[category] || category;
}

// 显示错误信息函数
function showError(message) {
  console.error('错误:', message);
  // 可以在这里添加显示错误信息到页面的逻辑
}

// 初始化筛选功能 - 已禁用，使用filter-fix.js中的实现
function initFilters() {
    console.log('main.js中的筛选功能已禁用，请使用filter-fix.js中的实现');
}

// 筛选作品 - 已禁用，使用filter-fix.js中的实现
function filterWorks(category) {
    console.log('main.js中的筛选功能已禁用，请使用filter-fix.js中的实现');
}

let currentWorkIndex = -1;
let allWorks = [];



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
