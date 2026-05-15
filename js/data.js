const projectsData = [
    {
        id: 1,
        title: "科技品牌重塑",
        category: "branding",
        categoryName: "品牌设计",
        image: "images/work1.jpg",
        gallery: [
            "images/work1.jpg",
            "images/work13.jpg",
            "images/work14.jpg"
        ],
        subtitle: "为新兴科技公司打造全新的品牌形象系统",
        client: "某科技公司",
        year: "2024",
        duration: "3个月",
        services: ["品牌策略", "视觉设计", "VI系统"],
        description: "这是一个品牌重塑的完整案例，从品牌策略到视觉落地全方位打造。我们深入分析了目标市场的需求和竞争环境，为客户打造了一个既现代又富有科技感的品牌形象。",
        challenge: "需要在保持品牌辨识度的同时，展现创新和前瞻性，吸引年轻化的目标用户群体。",
        solution: "通过深入的市场调研和用户洞察，重新定义品牌核心价值，打造全新的视觉语言和品牌体验。",
        results: [
            { number: "150%", label: "品牌认知度提升" },
            { number: "40%", label: "用户满意度提升" },
            { number: "3x", label: "社交媒体互动增长" }
        ],
        features: [
            { icon: "fa-lightbulb", title: "创新策略", description: "深入分析市场趋势和竞争环境，制定差异化的品牌策略。" },
            { icon: "fa-palette", title: "视觉系统", description: "创建完整的VI系统，确保品牌在各个触点的一致性。" },
            { icon: "fa-rocket", title: "落地执行", description: "从线上到线下，全方位落地品牌视觉形象。" }
        ],
        tags: ["品牌策略", "VI设计", "视觉系统", "数字营销"]
    },
    {
        id: 2,
        title: "移动APP界面设计",
        category: "ui",
        categoryName: "UI设计",
        image: "images/work2.jpg",
        gallery: [
            "images/work2.jpg",
            "images/work15.jpg",
            "images/work16.jpg"
        ],
        subtitle: "用户体验至上的移动应用界面设计",
        client: "某移动互联网公司",
        year: "2024",
        duration: "4个月",
        services: ["用户研究", "交互设计", "UI设计"],
        description: "专注于用户体验的移动应用设计，打造流畅自然的使用体验。通过用户研究和迭代设计，我们创造了一个既美观又实用的移动应用界面。",
        challenge: "在复杂功能和简洁界面之间找到平衡点，确保用户能够高效完成任务。",
        solution: "通过用户旅程地图和原型测试，不断优化交互流程，打造极致的用户体验。",
        results: [
            { number: "85%", label: "用户留存率" },
            { number: "4.8", label: "应用商店评分" },
            { number: "60%", label: "任务完成率提升" }
        ],
        features: [
            { icon: "fa-users", title: "用户研究", description: "通过问卷、访谈等方式深入了解目标用户需求。" },
            { icon: "fa-sitemap", title: "信息架构", description: "清晰的信息架构，让用户轻松找到所需功能。" },
            { icon: "fa-mobile-alt", title: "响应式设计", description: "适配各种屏幕尺寸，保证一致的体验。" }
        ],
        tags: ["UI设计", "UX设计", "移动端", "交互设计"]
    },
    {
        id: 3,
        title: "精品咖啡包装",
        category: "packaging",
        categoryName: "包装设计",
        image: "images/work3.jpg",
        gallery: [
            "images/work3.jpg",
            "images/work7.jpg",
            "images/work11.jpg"
        ],
        subtitle: "精品咖啡产品包装设计",
        client: "某咖啡品牌",
        year: "2024",
        duration: "2个月",
        services: ["包装设计", "结构设计", "生产指导"],
        description: "创意与功能并重的产品包装设计。我们注重每一个细节，从材料选择到结构设计，打造令人印象深刻的包装体验。",
        challenge: "在有限的成本内实现差异化的包装设计，同时保证环保可持续。",
        solution: "创新结构设计结合环保材料，打造独特的开箱体验，提升产品价值感。",
        results: [
            { number: "200%", label: "货架吸引力提升" },
            { number: "30%", label: "购买转化率提升" }
        ],
        features: [
            { icon: "fa-box", title: "结构创新", description: "独特的包装结构设计，提升产品价值感。" },
            { icon: "fa-leaf", title: "环保理念", description: "采用可回收材料，践行可持续发展理念。" }
        ],
        tags: ["包装设计", "结构设计", "环保包装"]
    },
    {
        id: 4,
        title: "美妆电商设计",
        category: "dianshang",
        categoryName: "电商设计",
        image: "images/work4.jpg",
        gallery: [
            "images/work4.jpg",
            "images/work1.jpg",
            "images/work2.jpg"
        ],
        subtitle: "高端美妆电商店铺视觉设计",
        client: "某美妆品牌",
        year: "2024",
        duration: "6个月",
        services: ["视觉设计", "页面优化", "营销设计"],
        description: "以数据驱动的电商视觉设计，有效提升转化率。通过科学的布局和精美的视觉设计，打造高转化的购物体验。",
        challenge: "在众多商品中脱颖而出，抓住用户注意力，提升页面的整体转化率。",
        solution: "通过A/B测试和数据分析，持续优化视觉呈现，找到最佳的设计方案。",
        results: [
            { number: "45%", label: "页面转化率提升" },
            { number: "35%", label: "客单价提升" },
            { number: "50%", label: "加购率提升" }
        ],
        features: [
            { icon: "fa-chart-line", title: "数据驱动", description: "基于数据分析优化视觉设计决策。" },
            { icon: "fa-image", title: "视觉统一", description: "建立统一的视觉语言，提升品牌识别度。" }
        ],
        tags: ["电商设计", "视觉营销", "UI设计", "数据分析"]
    },
    {
        id: 5,
        title: "连锁品牌VI设计",
        category: "branding",
        categoryName: "品牌设计",
        image: "images/work5.jpg",
        gallery: [
            "images/work5.jpg",
            "images/work1.jpg"
        ],
        subtitle: "统一品牌形象，提升品牌认知度",
        client: "某连锁企业",
        year: "2023",
        duration: "4个月",
        services: ["VI设计", "品牌规范", "应用设计"],
        description: "为连锁品牌打造完整的视觉识别系统，确保全国门店的统一形象。",
        challenge: "需要在不同门店、不同媒介上保持一致的视觉呈现。",
        solution: "建立完整的VI手册，涵盖所有应用场景，确保品牌一致性。",
        results: [
            { number: "100%", label: "门店形象统一" },
            { number: "50%", label: "品牌认知度提升" }
        ],
        features: [
            { icon: "fa-book", title: "VI手册", description: "建立完整的品牌视觉规范手册。" },
            { icon: "fa-store", title: "门店应用", description: "涵盖招牌、店内物料等所有应用。" }
        ],
        tags: ["VI设计", "品牌规范", "连锁品牌"]
    },
    {
        id: 6,
        title: "金融APP界面",
        category: "ui",
        categoryName: "UI设计",
        image: "images/work6.jpg",
        gallery: [
            "images/work6.jpg",
            "images/work2.jpg"
        ],
        subtitle: "安全易用的金融类应用设计",
        client: "某金融机构",
        year: "2023",
        duration: "5个月",
        services: ["UI设计", "交互设计", "用户体验"],
        description: "为金融应用打造专业、可信赖的界面设计，注重安全感和易用性的平衡。",
        challenge: "金融产品需要极强的安全感，同时又要保持操作的便捷性。",
        solution: "通过精心设计的视觉层次和交互流程，让复杂的金融操作变得简单直观。",
        results: [
            { number: "90%", label: "用户满意度" },
            { number: "40%", label: "操作效率提升" }
        ],
        features: [
            { icon: "fa-shield-alt", title: "安全保障", description: "通过视觉设计传递安全可信赖的品牌感受。" },
            { icon: "fa-sync", title: "操作简化", description: "优化操作流程，减少用户决策负担。" }
        ],
        tags: ["UI设计", "金融", "移动端"]
    },
    {
        id: 7,
        title: "有机食品包装",
        category: "packaging",
        categoryName: "包装设计",
        image: "images/work7.jpg",
        gallery: [
            "images/work7.jpg",
            "images/work3.jpg"
        ],
        subtitle: "有机食品包装系列",
        client: "某食品企业",
        year: "2023",
        duration: "3个月",
        services: ["包装设计", "标签设计", "陈列设计"],
        description: "为食品品牌打造健康、时尚的包装形象，突出产品特点吸引目标消费者。",
        challenge: "在众多同类产品中脱颖而出，传递健康、美味的品牌理念。",
        solution: "采用明亮的色彩搭配和清新的视觉风格，打造差异化的包装形象。",
        results: [
            { number: "180%", label: "货架吸引力提升" },
            { number: "25%", label: "销量增长" }
        ],
        features: [
            { icon: "fa-apple-alt", title: "健康理念", description: "通过设计传递健康、新鲜的产品特点。" },
            { icon: "fa-tags", title: "信息清晰", description: "清晰展示产品信息，方便消费者决策。" }
        ],
        tags: ["包装设计", "食品", "标签设计"]
    },
    {
        id: 8,
        title: "家居电商设计",
        category: "dianshang",
        categoryName: "电商设计",
        image: "images/work8.jpg",
        gallery: [
            "images/work8.jpg",
            "images/work3.jpg"
        ],
        subtitle: "家居电商平台视觉升级",
        client: "某家居电商",
        year: "2023",
        duration: "5个月",
        services: ["视觉设计", "页面优化", "移动端适配"],
        description: "为家居电商平台进行全面的视觉升级，打造温馨、品质的购物体验。",
        challenge: "家居产品需要营造温馨、舒适的视觉氛围，帮助用户想象产品在自己的家中呈现的效果。",
        solution: "采用暖色调和精致的排版，打造有温度的家居购物体验。",
        results: [
            { number: "50%", label: "页面转化率提升" },
            { number: "35%", label: "客单价提升" }
        ],
        features: [
            { icon: "fa-home", title: "场景化设计", description: "通过场景图帮助用户想象产品效果。" },
            { icon: "fa-mobile-alt", title: "移动端优化", description: "专注移动端用户体验优化。" }
        ],
        tags: ["电商设计", "家居", "移动端"]
    },
    {
        id: 9,
        title: "餐饮品牌设计",
        category: "branding",
        categoryName: "品牌设计",
        image: "images/work9.jpg",
        gallery: [
            "images/work9.jpg",
            "images/work4.jpg"
        ],
        subtitle: "餐饮品牌全套视觉设计",
        client: "某餐饮连锁",
        year: "2022",
        duration: "3个月",
        services: ["品牌设计", "空间设计", "物料设计"],
        description: "为餐饮品牌打造从线上到线下的完整视觉系统，包括LOGO、空间、餐具等全方位设计。",
        challenge: "餐饮品牌需要在视觉上传递美味、新鲜的品牌感受，同时保持识别度。",
        solution: "融合品牌故事和美食文化，打造独特的品牌视觉体验。",
        results: [
            { number: "200%", label: "社交媒体曝光增长" },
            { number: "40%", label: "顾客好评率提升" }
        ],
        features: [
            { icon: "fa-utensils", title: "全套设计", description: "涵盖LOGO、空间、餐具等全套视觉。" },
            { icon: "fa-camera", title: "拍照友好", description: "设计适合社交媒体传播的视觉元素。" }
        ],
        tags: ["品牌设计", "餐饮", "空间设计"]
    },
    {
        id: 10,
        title: "社交App UI",
        category: "ui",
        categoryName: "UI设计",
        image: "images/work10.jpg",
        gallery: [
            "images/work10.jpg",
            "images/work16.jpg"
        ],
        subtitle: "社交类移动应用界面设计",
        client: "某社交平台",
        year: "2022",
        duration: "4个月",
        services: ["UI设计", "交互设计", "动效设计"],
        description: "为年轻用户打造有趣的社交应用界面，注重个性表达和互动体验。",
        challenge: "社交应用需要有趣的交互体验，同时保持界面的清晰易用。",
        solution: "通过创新的交互设计和活泼的视觉风格，打造独特的社交体验。",
        results: [
            { number: "120%", label: "用户活跃度提升" },
            { number: "4.6", label: "应用评分" }
        ],
        features: [
            { icon: "fa-comments", title: "互动设计", description: "丰富的互动元素提升用户参与度。" },
            { icon: "fa-smile", title: "个性化", description: "丰富的自定义选项满足用户个性表达。" }
        ],
        tags: ["UI设计", "社交", "动效设计"]
    },
    {
        id: 11,
        title: "茶叶礼盒包装",
        category: "packaging",
        categoryName: "包装设计",
        image: "images/work11.jpg",
        gallery: [
            "images/work11.jpg",
            "images/work3.jpg"
        ],
        subtitle: "茶叶产品包装，融入传统文化元素",
        client: "某茶叶品牌",
        year: "2022",
        duration: "2个月",
        services: ["包装设计", "标签设计", "礼盒设计"],
        description: "为茶叶品牌打造融合传统文化的包装设计，突出产品的品质感和文化底蕴。",
        challenge: "需要在现代审美和传统文化之间找到平衡点。",
        solution: "运用传统元素结合现代设计手法，打造既有文化内涵又符合现代审美的包装。",
        results: [
            { number: "150%", label: "礼盒销量增长" },
            { number: "80%", label: "顾客满意度" }
        ],
        features: [
            { icon: "fa-leaf", title: "文化融入", description: "将传统文化元素融入现代包装设计。" },
            { icon: "fa-gift", title: "礼盒设计", description: "精致的礼盒设计适合馈赠亲友。" }
        ],
        tags: ["包装设计", "茶叶", "传统文化"]
    },
    {
        id: 12,
        title: "数码电商设计",
        category: "dianshang",
        categoryName: "电商设计",
        image: "images/work12.jpg",
        gallery: [
            "images/work12.jpg",
            "images/work5.jpg"
        ],
        subtitle: "数码产品电商视觉设计",
        client: "某数码品牌",
        year: "2022",
        duration: "5个月",
        services: ["视觉设计", "页面优化", "移动端适配"],
        description: "为数码产品电商平台进行全面的视觉升级，突出科技感与专业性。",
        challenge: "数码产品需要传递科技感和专业性，同时又要让普通消费者容易理解。",
        solution: "采用科技感的视觉元素和清晰的产品展示，打造专业的数码购物体验。",
        results: [
            { number: "50%", label: "页面转化率提升" },
            { number: "40%", label: "客单价提升" }
        ],
        features: [
            { icon: "fa-microchip", title: "科技感", description: "通过视觉元素传递产品的科技属性。" },
            { icon: "fa-mobile-alt", title: "移动端优化", description: "专注移动端用户体验优化。" }
        ],
        tags: ["电商设计", "数码", "移动端"]
    }
];

const featuredWorks = projectsData.slice(0, 4);

const categories = {
    branding: '品牌设计',
    ui: 'UI设计',
    packaging: '包装设计',
    dianshang: '电商设计'
};

const siteImages = {
    featured: [
        'images/featured1.jpg',
        'images/featured2.jpg',
        'images/featured3.jpg',
        'images/featured4.jpg'
    ],
    qrcode: 'images/qrcode.png'
};

function getCategoryName(category) {
    return categories[category] || category;
}

function getProjectById(id) {
    return projectsData.find(project => project.id === parseInt(id));
}

const defaultBlogPosts = [
    {
        id: 1,
        title: "2024年品牌设计趋势分析",
        date: "2024-01-15",
        category: "设计趋势",
        author: "城南设计",
        cover: "images/work1.jpg",
        slug: "2024-brand-trends",
        excerpt: "探讨新一年品牌设计的主流趋势，从色彩运用到视觉风格的演变"
    },
    {
        id: 2,
        title: "UI设计中的用户体验优化技巧",
        date: "2024-01-10",
        category: "UI设计",
        author: "城南设计",
        cover: "images/work2.jpg",
        slug: "ui-ux-tips",
        excerpt: "分享提升用户体验的实用技巧，让你的界面设计更加人性化"
    },
    {
        id: 3,
        title: "包装设计如何提升产品价值",
        date: "2024-01-05",
        category: "包装设计",
        author: "城南设计",
        cover: "images/work3.jpg",
        slug: "packaging-design",
        excerpt: "探讨包装设计在产品营销中的重要作用"
    },
    {
        id: 4,
        title: "电商视觉设计的转化密码",
        date: "2024-01-01",
        category: "电商设计",
        author: "城南设计",
        cover: "images/work4.jpg",
        slug: "ecommerce-design",
        excerpt: "揭秘高转化电商页面的设计秘诀"
    },
    {
        id: 5,
        title: "品牌VI系统建设指南",
        date: "2023-12-28",
        category: "品牌设计",
        author: "城南设计",
        cover: "images/work5.jpg",
        slug: "brand-vi-guide",
        excerpt: "从零开始建立完整的品牌视觉识别系统"
    },
    {
        id: 6,
        title: "设计师必备的配色技巧",
        date: "2023-12-20",
        category: "设计技巧",
        author: "城南设计",
        cover: "images/work6.jpg",
        slug: "color-theory",
        excerpt: "掌握这些配色原则，让你的设计更加专业"
    }
];

async function loadBlogPostsData() {
    try {
        const localStorageData = localStorage.getItem('blogPosts');
        if (localStorageData) {
            console.log('使用 localStorage 数据');
            return JSON.parse(localStorageData);
        }
        
        const response = await fetch('blog/metadata.json');
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.log('使用默认数据');
        return [...defaultBlogPosts];
    }
}

function getBlogPostById(id) {
    return window.blogPosts ? window.blogPosts.find(post => post.id === parseInt(id)) : defaultBlogPosts.find(post => post.id === parseInt(id));
}

async function getBlogPostBySlug(slug) {
    try {
        const posts = await loadBlogPostsData();
        return posts.find(post => post.slug === slug);
    } catch {
        return blogPosts.find(post => post.slug === slug);
    }
}

async function loadBlogContent(slug) {
    const filename = `blog/posts/${slug}.md`;
    try {
        const response = await fetch(filename);
        if (!response.ok) throw new Error('File not found');
        return await response.text();
    } catch (error) {
        console.log(`加载 ${filename} 失败，使用默认内容`);
        const defaultContent = {
            "2024-brand-trends": "# 2024年品牌设计趋势分析\n\n探讨新一年品牌设计的主流趋势，从色彩运用到视觉风格的演变。\n\n## 1. 极简主义的回归\n\n在经历了几年的复杂设计风潮后，极简主义重新成为主流。\n\n## 2. 大胆的色彩搭配\n\n品牌开始使用更具冲击力的色彩组合。\n\n## 3. 动态视觉元素\n\n动画和交互效果成为品牌设计的重要组成部分。",
            "ui-ux-tips": "# UI设计中的用户体验优化技巧\n\n分享提升用户体验的实用技巧。\n\n## 1. 直观的导航设计\n\n清晰的导航结构是良好用户体验的基础。\n\n## 2. 响应式布局\n\n确保你的设计在各种设备上都能提供良好的体验。\n\n## 3. 微交互设计\n\n精心设计的微交互可以让用户感受到产品的精致。",
            "packaging-design": "# 包装设计如何提升产品价值\n\n探讨包装设计在产品营销中的重要作用。\n\n## 1. 视觉吸引力\n\n好的包装设计能够在货架上脱颖而出。\n\n## 2. 品牌故事传递\n\n包装可以讲述品牌故事，传递品牌价值观。\n\n## 3. 功能性与美观的平衡\n\n优秀的包装设计既要美观大方，也要考虑实用性。",
            "ecommerce-design": "# 电商视觉设计的转化密码\n\n揭秘高转化电商页面的设计秘诀。\n\n## 1. 视觉层级分明\n\n通过合理的视觉层次引导用户视线。\n\n## 2. 高质量产品图片\n\n清晰、专业的产品图片是电商设计的核心。\n\n## 3. 营造紧迫感\n\n巧妙运用倒计时、库存提示等元素促进用户决策。",
            "brand-vi-guide": "# 品牌VI系统建设指南\n\n从零开始建立完整的品牌视觉识别系统。\n\n## 1. 品牌定位分析\n\n深入了解品牌定位和目标受众是成功的关键。\n\n## 2. 核心元素设计\n\nLOGO、标准色、标准字体是VI系统的核心要素。\n\n## 3. 应用规范制定\n\n制定详细的应用规范，确保品牌在各种场景下的一致性。",
            "color-theory": "# 设计师必备的配色技巧\n\n掌握这些配色原则，让你的设计更加专业。\n\n## 1. 色彩心理学\n\n了解不同颜色传递的情感和意义。\n\n## 2. 配色比例\n\n掌握60-30-10等经典配色比例。\n\n## 3. 色彩对比\n\n合理运用对比色和邻近色，增强视觉层次。"
        };
        return defaultContent[slug] || '# 文章内容未找到';
    }
}
