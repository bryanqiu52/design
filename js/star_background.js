/**
 * 动态星光背景效果
 * 用于在网页背景创建闪烁且向上飘动的星光效果
 */
function createStarBackground() {
  // 获取背景容器
  const particleBg = document.querySelector('.particle-bg');
  if (!particleBg) return;

  // 创建星星
  const starCount = 200; // 增加星星数量
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.className = 'star';

    // 随机位置
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    star.style.left = `${x}%`;
    star.style.top = `${y}%`;

    // 随机大小
    const size = Math.random() * 2 + 1;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;

    // 随机闪烁周期
    const twinkleDelay = Math.random() * 3;
    const twinkleDuration = Math.random() * 3 + 2;
    star.style.animationDelay = `${twinkleDelay}s, 0s`;
    star.style.animationDuration = `${twinkleDuration}s, ${Math.random() * 20 + 10}s`;

    // 随机不透明度（增加亮度）
    const opacity = Math.random() * 0.6 + 0.3;
    star.style.opacity = opacity;

    // 随机动画延迟，使星星移动不同步
    star.style.animationDelay = `${twinkleDelay}s, ${Math.random() * 5}s`;

    particleBg.appendChild(star);
  }

  // 添加CSS样式
  const style = document.createElement('style');
  style.textContent = `
    .particle-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      z-index: -1;
    }
    .star {
      position: absolute;
      background-color: white;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.2); /* 增加光晕效果，使星星更亮 */
      opacity: 0.5; /* 默认不透明度 */
      animation: twinkle linear infinite, floatUp linear infinite;
    }
    @keyframes twinkle {
      0% { opacity: 0.3; }
      50% { opacity: 1; }
      100% { opacity: 0.3; }
    }
    @keyframes floatUp {
      0% { transform: translateY(0) translateX(0); }
      100% { transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px); }
    }
  `;
  document.head.appendChild(style);
}

// 立即创建星光背景，不等待DOMContentLoaded事件
(function() {
  // 检查DOM是否已加载完成
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    createStarBackground();
  } else {
    // 如果DOM未加载完成，监听DOMContentLoaded事件
    document.addEventListener('DOMContentLoaded', createStarBackground);
  }
})();

// 添加随机的动画延迟，使星星动画更自然
document.addEventListener('DOMContentLoaded', function() {
  const stars = document.querySelectorAll('.star');
  stars.forEach(star => {
    // 为每个星星添加随机的动画延迟
    const floatDelay = Math.random() * 5;
    star.style.animationDelay = `${star.style.animationDelay.split(',')[0]}, ${floatDelay}s`;
  });
});