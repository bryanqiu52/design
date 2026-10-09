/* js/seo.js
 * 全站 SEO 元信息注入器（数据驱动）
 *
 * 加载时机：必须在 js/config.js 之后、页面内容渲染之后
 * （与 js/site-ui.js 放在同一位置即可，排在它前面或后面都行）。
 *
 * 工作原理：
 *   1. 静态页（首页 / 关于 / 联系 / 案例 / 博客列表）—— HTML head 里已写死基础 meta，
 *      本脚本只做补全（canonical、og:image、结构化数据），不覆盖已有内容。
 *   2. 动态页（project.html / blog-detail.html）—— 内容由 JS 渲染，
 *      渲染脚本会把当前数据挂到 window.__currentProject / window.__currentPost，
 *      本脚本据此写入准确的 title / description / og / canonical / JSON-LD。
 *
 * ⚠️ 重要限制：百度不执行 JS，动态写入的 meta 百度抓不到。
 *    详情页的真正收录靠 build-static.js 生成的静态 HTML（case/*.html），
 *    本脚本保证的是 Google / Bing 抓取与社交分享卡片正确。
 */
(function () {
    'use strict';

    var cfg = (typeof siteConfig !== 'undefined') ? siteConfig : {};
    var seo = cfg.seo || {};

    var SITE_URL = String(seo.siteUrl || '').replace(/\/+$/, '');
    var SITE_NAME = seo.siteName || cfg.siteTitle || '溪风设计';
    var DEFAULT_DESC = seo.defaultDescription || '';
    var DEFAULT_KEYWORDS = seo.defaultKeywords || '';
    var isFile = window.location.protocol === 'file:';

    /* 相对路径 → 绝对 URL */
    function abs(p) {
        if (!p) return '';
        if (/^https?:\/\//i.test(p)) return p;
        if (!SITE_URL) return p;
        return SITE_URL + '/' + String(p).replace(/^\//, '');
    }

    /* 当前页 canonical：file:// 本地预览时不产出，避免生成错误地址
       详情页（project.html?id=xx）统一指向它的静态版 case/<slug>.html，
       避免两个 URL 指向同一内容被判重复。 */
    function canonicalUrl() {
        if (isFile || !SITE_URL) return '';
        var p = window.__currentProject || window.__currentPost;
        if (p && p.slug) return SITE_URL + '/case/' + p.slug + '.html';
        var path = window.location.pathname.replace(/index\.html$/, '');
        return SITE_URL + path + window.location.search;
    }

    function upsertMeta(attr, key, content) {
        if (!content) return null;
        var el = document.head.querySelector('meta[' + attr + '="' + key + '"]');
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute(attr, key);
            document.head.appendChild(el);
        }
        el.setAttribute('content', content);
        return el;
    }

    function upsertLink(rel, href) {
        if (!href) return;
        var el = document.head.querySelector('link[rel="' + rel + '"]');
        if (!el) {
            el = document.createElement('link');
            el.setAttribute('rel', rel);
            document.head.appendChild(el);
        }
        el.setAttribute('href', href);
    }

    function upsertJsonLd(id, obj) {
        var old = document.getElementById(id);
        if (old && old.parentNode) old.parentNode.removeChild(old);
        var s = document.createElement('script');
        s.type = 'application/ld+json';
        s.id = id;
        s.textContent = JSON.stringify(obj);
        document.head.appendChild(s);
    }

    /* 页面已有的描述优先（静态页 head 里写死的），其次取配置，最后取正文首段 */
    function pickDescription() {
        var exist = document.head.querySelector('meta[name="description"]');
        if (exist && exist.getAttribute('content')) return exist.getAttribute('content');

        var p = window.__currentProject || window.__currentPost;
        if (p && p.seoDescription) return p.seoDescription;
        if (p && p.description) return String(p.description).slice(0, 160);
        if (p && p.excerpt) return String(p.excerpt).slice(0, 160);

        var node = document.querySelector('.project-overview p') ||
                   document.querySelector('#blogDetail p');
        var txt = node ? String(node.textContent || '').trim() : '';
        if (txt && txt !== '暂无描述') return txt.slice(0, 160);

        return DEFAULT_DESC;
    }

    /* og:image：详情页取主图，否则用配置里的默认分享图 */
    function pickImage() {
        var p = window.__currentProject || window.__currentPost;
        if (p) {
            var src = p.cover || p.image ||
                      (Array.isArray(p.gallery) && p.gallery.length ? p.gallery[0] : '');
            if (src) return abs(src);
        }
        var img = document.querySelector('#gallery-main-image') ||
                  document.querySelector('.hero-visual img');
        if (img && img.getAttribute('src')) return abs(img.getAttribute('src'));
        return abs(seo.ogImage || cfg.heroImage || '');
    }

    /* 组织结构化数据：全站注入一次，带公司名/地址/电话/社媒 */
    function organizationJsonLd() {
        return {
            '@context': 'https://schema.org',
            '@type': 'ProfessionalService',
            'name': cfg.company || '溪风设计',
            'alternateName': 'XIFOFLY',
            'url': SITE_URL || undefined,
            'logo': abs(cfg.logoNav) || undefined,
            'image': abs(seo.ogImage || cfg.heroImage) || undefined,
            'email': cfg.email || undefined,
            'telephone': cfg.phone || undefined,
            'address': cfg.address ? {
                '@type': 'PostalAddress',
                'streetAddress': cfg.address,
                'addressLocality': '深圳市',
                'addressRegion': '广东省',
                'addressCountry': 'CN'
            } : undefined,
            'sameAs': [cfg.bilibili, cfg.xiaohongshu, cfg.douyin].filter(Boolean)
        };
    }

    function apply() {
        var p = window.__currentProject || window.__currentPost;
        var title = document.title || SITE_NAME;
        var desc = pickDescription();
        var image = pickImage();
        var canonical = canonicalUrl();

        upsertMeta('name', 'description', desc);
        if (!document.head.querySelector('meta[name="keywords"]')) {
            upsertMeta('name', 'keywords',
                (p && p.tags && p.tags.length ? p.tags.join(',') : '') || DEFAULT_KEYWORDS);
        }

        upsertMeta('property', 'og:title', title);
        upsertMeta('property', 'og:description', desc);
        upsertMeta('property', 'og:image', image);
        upsertMeta('property', 'og:site_name', SITE_NAME);
        upsertMeta('property', 'og:locale', 'zh_CN');
        upsertMeta('property', 'og:type', p ? 'article' : 'website');
        if (canonical) upsertMeta('property', 'og:url', canonical);
        upsertMeta('name', 'twitter:card', 'summary_large_image');

        if (canonical && !document.head.querySelector('link[rel="canonical"]')) {
            upsertLink('canonical', canonical);
        }

        if (seo.enableJsonLd !== false) {
            upsertJsonLd('ld-organization', organizationJsonLd());

            if (window.__currentPost) {
                var post = window.__currentPost;
                upsertJsonLd('ld-page', {
                    '@context': 'https://schema.org',
                    '@type': 'Article',
                    'headline': post.title,
                    'description': post.seoDescription || post.excerpt || desc,
                    'image': abs(post.cover) || image,
                    'datePublished': post.date || undefined,
                    'dateModified': post.date || undefined,
                    'author': { '@type': 'Organization', 'name': post.author || SITE_NAME },
                    'publisher': {
                        '@type': 'Organization',
                        'name': cfg.company || SITE_NAME,
                        'logo': abs(cfg.logoNav) || undefined
                    },
                    'mainEntityOfPage': canonical ? { '@type': 'WebPage', '@id': canonical } : undefined
                });
            } else if (window.__currentProject) {
                var prj = window.__currentProject;
                upsertJsonLd('ld-page', {
                    '@context': 'https://schema.org',
                    '@type': 'CreativeWork',
                    'name': prj.title,
                    'description': prj.seoDescription || prj.description || desc,
                    'image': (Array.isArray(prj.gallery) && prj.gallery.length
                        ? prj.gallery.slice(0, 5).map(abs)
                        : [abs(prj.image || '')]),
                    'keywords': (prj.tags || []).join(',') || undefined,
                    'creator': { '@type': 'Organization', 'name': cfg.company || SITE_NAME }
                });
            }
        }
    }

    /* 页面可能仍在渲染（数据文件异步/延迟），DOMContentLoaded + load 各跑一次保证覆盖 */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply);
    } else {
        apply();
    }
    window.addEventListener('load', apply);

    window.XIFOFLY_SEO = { apply: apply, abs: abs, siteUrl: SITE_URL };
})();
