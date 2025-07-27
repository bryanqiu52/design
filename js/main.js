// 移动菜单交互
document.querySelector('.mobile-menu-btn').addEventListener('click', () => {
    document.querySelector('.nav-links').classList.toggle('show');
});

// 优化后的筛选代码
function filterWorks(category) {
    const grid = document.querySelector('.portfolio-grid');
    const currentScroll = window.pageYOffset; // 保存当前滚动位置
    
    grid.style.opacity = '0';
    
    setTimeout(() => {
        document.querySelectorAll('.work-card').forEach(card => {
            const shouldShow = category === 'all' || card.dataset.category === category;
            card.style.display = shouldShow ? 'block' : 'none';
            card.classList.toggle('filtering', !shouldShow);
        });

        // 强制触发布局重绘但不改变滚动位置
        requestAnimationFrame(() => {
            grid.style.display = 'none';
            grid.offsetHeight; // 触发重排
            grid.style.display = 'grid';
            grid.style.opacity = '1';
            window.scrollTo(0, currentScroll); // 恢复滚动位置
        });
    }, 300);
}

// 事件绑定
document.querySelectorAll('.filter-controls button').forEach(btn => {
    btn.addEventListener('click', function() {
        // 移除所有active状态
        document.querySelectorAll('.filter-controls button').forEach(b => {
            b.classList.remove('active');
        });
        this.classList.add('active');
        
        // 获取分类并筛选
        const category = this.dataset.category;
        filterWorks(category);
    });
});

// 初始化显示全部
filterWorks('all');

// 初始化雷达图
const radarConfig = {
    type: 'radar',
    data: {
        labels: ['用户体验', '视觉设计', '交互逻辑', '技术实现', '品牌感知'],
        datasets: [{
            label: '技能分布',
            data: [85, 90, 80, 75, 88],
            backgroundColor: 'rgba(255,51,102,0.2)',
            borderColor: '#ff3366',
            pointBackgroundColor: '#fff',
            pointBorderColor: '#ff3366'
        }]
    },
    options: {
        scales: {
            r: {
                beginAtZero: true,
                max: 100,
                ticks: { display: false },
                grid: { color: 'rgba(255,255,255,0.1)' },
                angleLines: { color: 'rgba(255,255,255,0.1)' }
            }
        }
    }
};

new Chart(document.getElementById('skillRadar'), radarConfig);