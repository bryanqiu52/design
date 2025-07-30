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

// 简化版浮窗逻辑
document.addEventListener('DOMContentLoaded', () => {
const modal = document.getElementById('formModal');
const openBtn = document.querySelector('.open-message-btn');
const closeBtn = modal.querySelector('.modal-close');

// 打开浮窗
openBtn.addEventListener('click', () => {
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
});

// 关闭浮窗
function closeModal() {
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

closeBtn.addEventListener('click', closeModal);

// 点击背景关闭
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

// ESC键关闭
 document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('active')) {
    closeModal();
  }
});
});