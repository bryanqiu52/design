/* site-ui.js
 * 全站公共导航栏与页脚渲染（数据驱动，兼容 file:// 直接打开与 GitHub Pages）
 * 依赖：js/config.js（window.siteConfig）
 * 页面中通过 <div id="site-nav"></div> 和 <div id="site-footer"></div> 占位，
 * 此脚本会在页面加载时自动填充，并统一处理导航交互。
 */
(function () {
    'use strict';

    var cfg = (typeof siteConfig !== 'undefined') ? siteConfig : {};
    function val(key, fallback) {
        return (cfg[key] !== undefined && cfg[key] !== '') ? cfg[key] : fallback;
    }

    /* 当前页面文件名，用于导航高亮 */
    var pathParts = window.location.pathname.split('/');
    var currentFile = pathParts[pathParts.length - 1] || 'index.html';

    /* 导航菜单配置 */
    var menu = [
        { href: 'index.html', text: '首页', en: 'HOME' },
        { href: 'cases.html', text: '案例', en: 'CASES' },
        { href: 'blog.html', text: '博客', en: 'BLOG' },
        { href: 'about.html', text: '关于', en: 'ABOUT' },
        { href: 'contact.html', text: '联系', en: 'CONTACT' }
    ];

    var siteTitle = val('siteTitle', '溪风');
    var siteSubtitle = val('siteSubtitle', '轻盈自有回响');

    /* 网站图标 favicon（后台可配置，支持 .ico；未配置时保持空）
       删除旧 link 并新建追加到 head，强制浏览器重新加载，避免动态改 href 不生效 */
    var faviconPath = val('favicon', '');
    if (faviconPath) {
        var oldFavicon = document.getElementById('site-favicon');
        if (oldFavicon) oldFavicon.parentNode.removeChild(oldFavicon);
        var faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        faviconLink.href = faviconPath;
        faviconLink.type = /\.ico$/i.test(faviconPath) ? 'image/x-icon' : 'image/png';
        document.head.appendChild(faviconLink);
    }

    function isActive(href) {
        return href === currentFile ? ' class="active"' : '';
    }

    /* ========== 渲染导航 ========== */
    var navBox = document.getElementById('site-nav');
    if (navBox) {
        var navLinksHtml = menu.map(function (item) {
            return '<a href="' + item.href + '"' + isActive(item.href) + '>' + item.text + '</a>';
        }).join('');

        var mmenuHtml = menu.map(function (item, i) {
            var num = String(i + 1);
            if (num.length < 2) num = '0' + num;
            return '<a href="' + item.href + '"><span>' + num + '</span>' + item.text + '<em class="mm-en">' + item.en + '</em></a>';
        }).join('');

        navBox.innerHTML =
            '<nav class="nav" id="nav">' +
            '<a href="index.html" class="logo">' +
            '<img src="' + val('logoNav', 'images/xifofly-logo.png') + '" alt="' + siteTitle + '" class="logo-img">' +
            '</a>' +
            '<div class="nav-links" id="navLinks">' + navLinksHtml + '</div>' +
            '<div class="nav-actions">' +
            '<a href="contact.html" class="nav-cta">开始合作 <span>→</span></a>' +
            '<button class="burger" id="burger" aria-label="打开菜单"><i></i><i></i><i></i></button>' +
            '</div>' +
            '</nav>' +
            '<div class="mmenu" id="mmenu">' + mmenuHtml + '</div>';

        /* 导航交互：滚动阴影、移动菜单开合 */
        var nav = navBox.querySelector('#nav');
        var burger = navBox.querySelector('#burger');
        var mmenu = navBox.querySelector('#mmenu');

        function onNavScroll() {
            var y = window.scrollY || 0;
            nav.classList.toggle('scrolled', y > 12);
        }
        window.addEventListener('scroll', onNavScroll, { passive: true });
        onNavScroll();

        if (burger && mmenu) {
            burger.addEventListener('click', function () {
                var open = mmenu.classList.toggle('open');
                burger.classList.toggle('open', open);
                burger.setAttribute('aria-expanded', String(open));
                document.body.style.overflow = open ? 'hidden' : '';
            });

            mmenu.querySelectorAll('a').forEach(function (a) {
                a.addEventListener('click', function () {
                    mmenu.classList.remove('open');
                    burger.classList.remove('open');
                    burger.setAttribute('aria-expanded', 'false');
                    document.body.style.overflow = '';
                });
            });
        }
    }

    /* ========== 渲染页脚 ========== */
    var footerBox = document.getElementById('site-footer');
    if (footerBox) {
        var year = new Date().getFullYear();

        footerBox.innerHTML =
            '<footer class="footer footer-v2">' +
            '<div class="container">' +
            '<div class="footer-head">' +
            '<a href="index.html" class="footer-brand-link">' +
            '<img src="' + val('logoFooter', 'images/xifofly-logo.png') + '" alt="' + siteTitle + '" class="footer-brand-logo">' +
            '</a>' +
            '<p class="footer-tagline">' + siteSubtitle + ' <span>Lightness echoes.</span></p>' +
            '</div>' +
            '<div class="footer-grid">' +
            '<div class="footer-col footer-col-left">' +
            '<div class="footer-contact">' +
            '<h4>联系方式</h4>' +
            '<ul>' +
            '<li><i class="fas fa-building"></i> <span>' + val('company', '') + '</span></li>' +
            '<li><i class="fas fa-envelope"></i> <span>' + val('email', '') + '</span></li>' +
            '<li><i class="fab fa-weixin"></i> <span>' + val('wechat', '') + '</span></li>' +
            '</ul>' +
            '</div>' +
            '<div class="footer-social">' +
            '<div class="social-rings">' +
            '<a href="#" title="视频号" class="social-ring">视</a>' +
            '<a href="#" title="抖音" class="social-ring">抖</a>' +
            '<a href="#" title="bilibili" class="social-ring">B</a>' +
            '<a href="#" title="小红书" class="social-ring">红</a>' +
            '</div>' +
            '</div>' +
            '<div class="footer-copyright">' +
            '<p>© ' + year + ' ' + siteTitle + ' (XIFOFLY). All rights reserved.</p>' +
            '</div>' +
            '</div>' +
            '<div class="footer-col footer-col-center">' +
            '<div class="footer-form">' +
            '<h4>留言</h4>' +
            '<form id="footerContactForm" action="https://api.web3forms.com/submit" method="POST">' +
            '<input type="hidden" name="access_key" value="a76d1a6a-52bc-441e-9e35-ab12927b0805">' +
            '<input type="hidden" name="subject" value="网站页脚快速咨询留言">' +
            '<input type="hidden" name="from_name" value="网站访客">' +
            '<input type="text" name="botcheck" style="display:none !important;visibility:hidden;position:absolute;left:-9999px;width:0;height:0;opacity:0;" tabindex="-1" autocomplete="off" aria-hidden="true">' +
            '<input type="text" name="name" placeholder="您的姓名" required>' +
            '<input type="email" name="email" placeholder="邮箱地址" required>' +
            '<textarea name="message" placeholder="简单描述您的需求..." required></textarea>' +
            '<button type="submit" class="btn btn-primary footer-form-btn">' +
            '<span>发送咨询</span>' +
            '<i class="fas fa-paper-plane"></i>' +
            '</button>' +
            '</form>' +
            '</div>' +
            '</div>' +
            '<div class="footer-col footer-col-right">' +
            '<div class="footer-qrcode-card">' +
            '<div class="footer-qrcodes">' +
            '<div class="footer-qrcode">' +
            '<h4>公众号</h4>' +
            '<img src="' + val('qrcodeWechat', 'images/qrcode.png') + '" alt="公众号" class="qrcode-img">' +
            '<p>扫码关注</p>' +
            '</div>' +
            '<div class="footer-qrcode">' +
            '<h4>企业微信</h4>' +
            '<img src="' + val('qrcodeWorkwechat', 'images/qrcode.png') + '" alt="企业微信" class="qrcode-img">' +
            '<p>扫码联系</p>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</footer>';

        /* 页脚快速咨询表单：AJAX 提交 Web3Forms，成功后在原位显示反馈，不跳转 */
        var footerForm = document.getElementById('footerContactForm');
        if (footerForm) {
            footerForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var fd = new FormData(footerForm);
                var btn = footerForm.querySelector('.footer-form-btn');
                if (btn) { btn.disabled = true; btn.querySelector('span').textContent = '发送中...'; }
                fetch(footerForm.action, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } })
                    .then(function (res) { return res.json(); })
                    .then(function (data) {
                        if (data && data.success) {
                            footerForm.innerHTML = '<p class="footer-form-success">已收到您的留言，我们会尽快回复！</p>';
                        } else {
                            throw new Error('submit failed');
                        }
                    })
                    .catch(function () {
                        if (btn) { btn.disabled = false; btn.querySelector('span').textContent = '发送咨询'; }
                        footerForm.insertAdjacentHTML('beforeend', '<p class="footer-form-error">发送失败，请稍后再试或直接邮件联系</p>');
                    });
            });
        }
    }
})();
