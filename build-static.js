/* build-static.js
 * 案例静态页 + sitemap 生成器
 *
 * 运行：node build-static.js（ESA Pages 在每次 push 后自动执行）
 *
 * 做什么：
 *   1. 读 js/data.js 的 projectsData，为每个案例生成 case/<slug>.html
 *   2. 生成的页面把 title / description / 图集 alt / 正文全部写死在 HTML 里，
 *      爬虫不执行 JS 也能读到完整内容（这是百度能收录案例的关键）
 *   3. 生成 sitemap.xml
 *
 * 不做什么：
 *   - 不改动任何源文件。js/data.js 仍是唯一真源，case/ 是产物，不可手改
 *   - 不处理博客（后台博客编辑已停更，博客静态化留到以后）
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE_URL = 'https://www.xifofly.com';

/* ---------- 读取数据源 ---------- */
/* data.js 里有 window.blogPosts 赋值，Node 环境要先造一个 window */
global.window = global;

const dataSrc = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
const projectsData = new Function(dataSrc + '\nreturn projectsData;')();
const categories = new Function(dataSrc + '\nreturn categories;')();

const cfgSrc = fs.readFileSync(path.join(ROOT, 'js/config.js'), 'utf8');
const siteConfig = new Function(cfgSrc + '\nreturn siteConfig;')();
const seo = siteConfig.seo || {};

/* ---------- 工具 ---------- */
function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function catName(p) {
    return p.categoryName || (categories && categories[p.category]) || '设计';
}

/* 描述兜底：数据里大量 description 为空，甚至是测试数据，不能让页面没有描述 */
function buildDesc(p) {
    let d = String(p.seoDescription || p.description || '').trim();
    if (!d || /^\d{4,}$/.test(d)) {
        d = `${p.title}｜${catName(p)}设计案例。溪风设计（XIFOFLY）为该客户提供了${catName(p)}服务，点击查看完整作品图集与设计说明。`;
    }
    return d;
}

function buildKeywords(p) {
    const tags = Array.isArray(p.tags) ? p.tags : [];
    return [...new Set([p.title, catName(p), ...tags, '溪风设计', 'XIFOFLY'].filter(Boolean))]
        .join(',');
}

/* 图片 alt：案例标题 + 分类，别再用光秃秃的标题 */
function imgAlt(p, i) {
    return `${p.title} ${catName(p)}设计作品 ${i + 1}`;
}

/* ---------- 响应式图片（srcset）----------
 * 800px 宽的变体由 xifofly-writer 的 temp/_a-srcset.js 批量生成，命名固定为 xxx-800w.webp。
 * 构建时读 WebP 头拿原图真实宽度，把「800w 变体 + 原图」一起写进 srcset：
 * 手机取 800w（体积常常只有原图三分之一），桌面 / 视网膜屏仍取原图，不牺牲清晰度。
 * 变体不存在或读不出宽度就整条不写 —— 宁可没有 srcset，也不能写错描述符。 */
function webpWidth(abs) {
    let buf;
    try {
        const fd = fs.openSync(abs, 'r');
        buf = Buffer.alloc(40);
        fs.readSync(fd, buf, 0, 40, 0);
        fs.closeSync(fd);
    } catch (e) { return 0; }
    if (buf.slice(0, 4).toString() !== 'RIFF' || buf.slice(8, 12).toString() !== 'WEBP') return 0;
    const chunk = buf.slice(12, 16).toString();
    if (chunk === 'VP8X') return 1 + buf.readUIntLE(24, 3);
    if (chunk === 'VP8 ') return buf.readUInt16LE(26) & 0x3fff;
    if (chunk === 'VP8L') return 1 + ((buf[22] | (buf[23] << 8) | (buf[24] << 16)) & 0x3fff);
    return 0;
}
const SIZES = '(max-width: 900px) 100vw, 900px';
function srcsetOf(src) {
    if (!/\.webp$/i.test(String(src))) return '';
    const relPath = decodeURIComponent(String(src)).replace(/^\/+/, '');
    const abs = path.join(ROOT, relPath);
    const small = abs.replace(/\.webp$/i, '-800w.webp');
    if (!fs.existsSync(small) || !fs.existsSync(abs)) return '';
    const w = webpWidth(abs);
    if (!w || w <= 800) return '';
    const relSmall = path.relative(ROOT, small).split(path.sep).join('/');
    return ` srcset="${esc(relSmall)} 800w, ${esc(src)} ${w}w" sizes="${SIZES}"`;
}

/* ---------- 展示方式 A：长图纵向平铺 ---------- */
function renderGalleryA(p, images) {
    const items = images.map((src, i) =>
        `                <img src="${esc(src)}"${srcsetOf(src)} alt="${esc(imgAlt(p, i))}" loading="lazy">`
    ).join('\n');
    return `            <div class="project-gallery gallery-style-a">
${items}
            </div>`;
}

/* ---------- 展示方式 B：主图 + 小地图 + 缩略图 ----------
   DOM 结构与 project.html 的 renderGalleryStyleB 保持一致，交互交给 js/gallery-b.js。
   所有图片都写死在缩略图的 <img> 里，爬虫照样能读到每一张，SEO 不受影响。 */
function renderGalleryB(p, images) {
    const mainImage = images[0];
    const thumbs = images.map((src, i) =>
        `                        <div class="gallery-thumb-item${i === 0 ? ' active' : ''}" data-index="${i}" data-src="${esc(src)}">
                            <img src="${esc(src)}"${srcsetOf(src)} alt="${esc(imgAlt(p, i))}" loading="lazy">
                        </div>`
    ).join('\n');
    return `            <div class="project-gallery gallery-style-b">
                <div class="gallery-main" id="gallery-main">
                    <div class="gallery-main-viewer" id="gallery-main-viewer">
                        <div class="gallery-main-wrapper" id="gallery-main-wrapper">
                            <img src="${esc(mainImage)}"${srcsetOf(mainImage)} alt="${esc(imgAlt(p, 0))}" id="gallery-main-image">
                        </div>
                    </div>
                    <div class="gallery-click-hint">
                        <i class="fas fa-search-plus"></i>
                        <span>点击查看大图</span>
                    </div>
                </div>

                <div class="gallery-minimap" id="gallery-minimap">
                    <img class="minimap-base" src="${esc(mainImage)}" alt="">
                    <div class="minimap-dim"></div>
                    <div class="minimap-viewport" id="minimap-viewport">
                        <img class="minimap-viewport-img" src="${esc(mainImage)}" alt="">
                    </div>
                </div>

                <div class="gallery-sidebar">
                    <div class="gallery-thumbs">
${thumbs}
                    </div>
                </div>
            </div>`;
}

/* 灯箱（仅 B 样式需要）：结构复用 project.html 那套，直接吃 styles.css 的现成规则 */
const LIGHTBOX_HTML = `<div class="lightbox-overlay" id="lightbox-overlay">
    <div class="lightbox-content">
        <button class="lightbox-close" id="lightbox-close"><i class="fas fa-times"></i></button>
        <button class="lightbox-prev" id="lightbox-prev"><i class="fas fa-chevron-left"></i></button>
        <button class="lightbox-next" id="lightbox-next"><i class="fas fa-chevron-right"></i></button>
        <div class="lightbox-image-viewer" id="lightbox-image-viewer">
            <div class="lightbox-image-wrapper" id="lightbox-image-wrapper">
                <!-- 占位图不写 src：打开灯箱时由 gallery-b.js 赋值。留空 src 会让浏览器按当前页地址再发一次请求 -->
                <img id="lightbox-image" alt="大图展示">
            </div>
            <div class="lightbox-counter" id="lightbox-counter"></div>
        </div>

        <!-- 长图小地图（minimap）：仅在长图模式显示 -->
        <div class="lightbox-minimap" id="lightbox-minimap">
            <img class="minimap-base" alt="">
            <div class="minimap-dim"></div>
            <div class="minimap-viewport">
                <img class="minimap-viewport-img" alt="">
            </div>
        </div>

        <!-- 缩放控件栏 -->
        <div class="lightbox-zoom-controls" id="lightbox-zoom-controls">
            <button class="zoom-btn" id="zoom-out-btn" data-tooltip="缩小 [滚轮]">
                <i class="fas fa-minus"></i>
            </button>
            <span class="zoom-level" id="zoom-level-display">fit</span>
            <button class="zoom-btn" id="zoom-in-btn" data-tooltip="放大 [滚轮]">
                <i class="fas fa-plus"></i>
            </button>
            <button class="zoom-btn" id="zoom-reset-btn" data-tooltip="适应屏幕">
                <i class="fas fa-expand"></i>
            </button>
            <button class="zoom-btn" id="bg-toggle-btn" data-tooltip="切换背景">
                <i class="fas fa-palette"></i>
            </button>
        </div>

        <div class="lightbox-thumbnails">
            <div id="lightbox-thumbnails-container"></div>
        </div>
    </div>
</div>`;

/* ---------- 页面模板 ---------- */
function page(p, prev, next, related) {
    const slug = p.slug;
    /* 干净 URL：站点在 ESA 上会把 .html 去掉（307 跳转），
       所以对外地址（canonical / og:url / JSON-LD）一律不带 .html，
       与真实可访问的地址一致；磁盘上的文件名仍是 <slug>.html 不变。 */
    const url = `${SITE_URL}/case/${slug}`;
    /* 分类名与标题相同时不重复（如 AIGC 分类下的 AIGC 案例）；后台填了 SEO 标题则优先用 */
    const cn = catName(p);
    /* 中文标题的通行长度是 20–32 字（百度 SERP ≤30 汉字）。原来是固定挂「- 溪风设计 XIFOFLY」，
     * 48 个案例里 18 个落到 33–41 字的边界、1 个直接越界，白扣 title_len。
     * 改成按长度自适应：超长先缩品牌后缀，再缩成「案例｜溪风设计」，偏短补「与作品」。 */
    const baseTitle = (cn && cn !== p.title)
        ? `${p.title}｜${cn}设计案例`
        : `${p.title}设计案例`;
    const autoTitle = (function () {
        let t = baseTitle + `｜溪风设计 XIFOFLY`;
        if (t.length > 32) t = baseTitle + `｜溪风设计`;
        if (t.length > 32) t = `${p.title}｜${cn || ''}案例｜溪风设计`;
        if (t.length < 20) t = baseTitle + `与作品｜溪风设计`;
        return t;
    })();
    const title = p.seoTitle || autoTitle;
    const desc = buildDesc(p);
    /* 项目概述优先用数据里真实写的 description，没有才用兜底文案 */
    const rawDesc = String(p.description || '').trim();
    const overview = (rawDesc && !/^\d{4,}$/.test(rawDesc)) ? rawDesc : desc;
    const cover = p.image || (p.gallery && p.gallery[0]) || '';
    const gallery = (p.gallery && p.gallery.length ? p.gallery : [cover]).filter(Boolean);

    /* 结构化数据：静态页必须写死在 HTML 里。
       js/seo.js 只给动态页注入 CreativeWork（依赖 window.__currentProject），
       静态页没有这个变量，不写死的话连 Google 都读不到案例结构化数据。 */
    const orgLd = {
        '@context': 'https://schema.org',
        '@type': 'ProfessionalService',
        'name': siteConfig.company || '溪风设计',
        'alternateName': 'XIFOFLY',
        'url': SITE_URL,
        'email': siteConfig.email || undefined,
        'logo': siteConfig.logoNav ? `${SITE_URL}/${siteConfig.logoNav}` : undefined
    };
    const workLd = {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        'name': p.title,
        'description': desc,
        'url': url,
        'image': gallery.slice(0, 5).map(g => `${SITE_URL}/${g}`),
        'keywords': (p.tags || []).join(',') || undefined,
        'creator': {
            '@type': 'Organization',
            'name': siteConfig.company || '溪风设计',
            'url': SITE_URL
        },
        'mainEntityOfPage': { '@type': 'WebPage', '@id': url }
    };
    /* JSON 里不能出现裸 </script>，把 < 统一转义（JSON.stringify 会自动丢掉 undefined 的键） */
    const jsonLdHtml =
        '<script type="application/ld+json">' + JSON.stringify(orgLd).replace(/</g, '\\u003c') + '</script>\n' +
        '<script type="application/ld+json">' + JSON.stringify(workLd).replace(/</g, '\\u003c') + '</script>';

    const tagsHtml = (p.tags || [])
        .map(t => `<span class="project-tag">${esc(t)}</span>`).join('');

    /* 展示方式必须按数据里的 displayStyle 分流（A 平铺 / B 主图+缩略图），
       不能统一成一种——47 个案例是 B，写死成 A 等于把它们的展示方式全改了 */
    const isStyleB = (p.displayStyle === 'B');
    /* 页面带 <base href="../">，所以这里的路径一律写成相对网站根的形式 */
    const galleryHtml = isStyleB ? renderGalleryB(p, gallery) : renderGalleryA(p, gallery);
    const lightboxHtml = isStyleB ? LIGHTBOX_HTML : '';
    const galleryScript = isStyleB ? '<script src="js/gallery-b.js"></script>' : '';

    const relatedHtml = related.map(r =>
        `                        <a href="case/${esc(r.slug)}" class="case-item">
                            <div class="case-image">
                                <img src="${esc(r.image)}"${srcsetOf(r.image)} alt="${esc(r.title)}" loading="lazy">
                            </div>
                            <div class="case-info">
                                <span class="case-category">${esc(catName(r))}</span>
                                <h3>${esc(r.title)}</h3>
                            </div>
                        </a>`
    ).join('\n');

    const prevLink = prev
        ? `<a href="case/${esc(prev.slug)}" class="project-nav-link"><i class="fas fa-arrow-left"></i><span>上一个</span><span>${esc(prev.title)}</span></a>`
        : `<a href="cases" class="project-nav-link disabled"><i class="fas fa-arrow-left"></i><span>上一个</span><span>--</span></a>`;

    const nextLink = next
        ? `<a href="case/${esc(next.slug)}" class="project-nav-link next"><span>下一个</span><span>${esc(next.title)}</span><i class="fas fa-arrow-right"></i></a>`
        : `<a href="cases" class="project-nav-link next disabled"><span>下一个</span><span>--</span><i class="fas fa-arrow-right"></i></a>`;

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<base href="../"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<meta name="keywords" content="${esc(buildKeywords(p))}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:type" content="article"/>
<meta property="og:url" content="${esc(url)}"/>
<meta property="og:image" content="${esc(SITE_URL)}/${esc(cover)}"/>
<meta property="og:site_name" content="溪风设计 XIFOFLY"/>
<meta property="og:locale" content="zh_CN"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="canonical" href="${esc(url)}"/>
${jsonLdHtml}
<link href="vendor/fontawesome/css/all.min.css" rel="stylesheet"/>
<link href="styles.css" rel="stylesheet"/>
<link rel="icon" href="images/favicon.ico" type="image/x-icon"/>
</head>
<body>
<canvas id="spark-canvas"></canvas>
<script src="js/spark.js"></script>

<div id="site-nav"></div>
<nav class="breadcrumb" aria-label="面包屑">
    <a href="index.html">首页</a>
    <span class="breadcrumb-sep">/</span>
    <a href="cases">案例</a>
    <span class="breadcrumb-sep">/</span>
    <span class="breadcrumb-current">${esc(p.title)}</span>
</nav>


<section class="project-hero">
    <div class="page-aurora"></div>
    <div class="project-hero-container">
        <div class="project-hero-left">
            <div class="project-hero-top">
                <span class="project-category">${esc(catName(p))}</span>
                <h1>${esc(p.title)}</h1>
                <p class="project-subtitle">${esc(p.subtitle || '')}</p>
            </div>
            <div class="project-tags">${tagsHtml}</div>
        </div>
        <div class="project-hero-right">
            <div class="project-overview">
                <h2>项目概述</h2>
                <p>${esc(overview)}</p>
            </div>
        </div>
    </div>
</section>

<section class="container">
    <div class="project-content">
        <div class="project-section" data-animate>
            <h2>案例展示</h2>
${galleryHtml}
        </div>

        <p class="works-disclaimer">本站展示案例的作品版权归相应客户所有，此处仅作设计展示，不得转载或商用。</p>

        <div class="project-nav-anchor"></div>
        <div class="project-nav-card">
            ${prevLink}
            <a href="cases" class="back-btn"><i class="fas fa-arrow-left"></i><span>返回案例</span></a>
            ${nextLink}
        </div>
    </div>
</section>

<section class="other-cases-section">
    <div class="container">
        <div class="section-header">
            <h2>其他案例</h2>
            <div class="cases-nav">
                <button class="cases-prev-btn" type="button" aria-label="上一组"><i class="fas fa-chevron-left"></i></button>
                <button class="cases-next-btn" type="button" aria-label="下一组"><i class="fas fa-chevron-right"></i></button>
            </div>
        </div>
        <div class="cases-scroll-container" id="casesScrollContainer">
            <div class="cases-list" id="casesList">
${relatedHtml}
            </div>
        </div>
    </div>
</section>

${lightboxHtml}

<div id="site-footer"></div>

<script src="js/config.js"></script>
<script src="js/site-ui.js"></script>
<script src="js/seo.js"></script>
<script src="js/aurora.js"></script>
<script src="js/image-protect.js"></script>
<script src="js/nav-card.js"></script>
<script src="js/cases-scroll.js"></script>
${galleryScript}
</body>
</html>
`;
}

/* 相关案例：同分类优先，其次同标签 */
function relatedOf(p, all) {
    const scored = all
        .filter(x => x.slug && x.slug !== p.slug)
        .map(x => {
            let s = 0;
            if (x.category === p.category) s += 3;
            if (x.tags && p.tags) {
                s += x.tags.filter(t => p.tags.includes(t)).length * 2;
            }
            return { x, s };
        })
        .sort((a, b) => b.s - a.s);
    return scored.slice(0, 8).map(i => i.x);
}

/* ---------- 生成 ---------- */
const outDir = path.join(ROOT, 'case');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const list = projectsData.filter(p => p.slug);
const skipped = projectsData.length - list.length;

const today = new Date().toISOString().slice(0, 10);

/* 按 sortOrder 排列，让上一个/下一个顺序与网站展示一致 */
const ordered = [...list].sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0));

ordered.forEach((p, i) => {
    const prev = i > 0 ? ordered[i - 1] : null;
    const next = i < ordered.length - 1 ? ordered[i + 1] : null;
    fs.writeFileSync(
        path.join(outDir, p.slug + '.html'),
        page(p, prev, next, relatedOf(p, ordered)),
        'utf8'
    );
});

/* ---------- sitemap ---------- */
const urls = [
    { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'weekly' },
    { loc: `${SITE_URL}/cases`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${SITE_URL}/about`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${SITE_URL}/contact`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${SITE_URL}/blog`, priority: '0.6', changefreq: 'weekly' }
];

ordered.forEach(p => {
    urls.push({ loc: `${SITE_URL}/case/${p.slug}`, priority: '0.8', changefreq: 'monthly' });
});

/* 博客：从 blog/index.json（写作台生成的索引）读取并追加进 sitemap。
   为什么要在这里也写一遍：后台「重建静态页」只跑本脚本，而博客条目若只由
   build-blog.js 写入，后台保存作品后会把 sitemap 里的博客条目整段冲掉。
   这里补上，build-blog.js 随后按同样规则刷新（幂等，不会重复）。
   只列 blog/<slug> 静态页，不出现已废弃的 blog-detail.html?slug= 动态地址。 */
let blogItems = [];
try {
    const blogIndexPath = path.join(ROOT, 'blog', 'index.json');
    if (fs.existsSync(blogIndexPath)) {
        const parsed = JSON.parse(fs.readFileSync(blogIndexPath, 'utf8'));
        if (Array.isArray(parsed)) blogItems = parsed;
    }
} catch (e) {
    console.warn('sitemap：读取 blog/index.json 失败，跳过博客条目（' + e.message + '）');
}
blogItems.forEach(p => {
    if (!p || !p.slug) return;
    urls.push({
        loc: `${SITE_URL}/blog/${p.slug}`,
        priority: '0.6',
        changefreq: 'monthly',
        lastmod: p.date || today
    });
});

/* SEO 一键修复：sitemap 补录遗漏静态页（404.html 不收录；case/ 已含） */
const __seoSeen = new Set(urls.map(function (u) { return u.loc; }));
let __seoExtra = 0;
(function () {
    const __walk = function (dir, prefix) {
        let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
        ents.forEach(function (en) {
            const abs = path.join(dir, en.name);
            if (en.isDirectory()) {
                if (en.name.charAt(0) === '.' || en.name === '_drafts' || en.name === 'vendor' || en.name === 'node_modules') return;
                __walk(abs, prefix + en.name + '/');
            } else if (en.isFile() && en.name.toLowerCase().endsWith('.html') && en.name !== '404.html') {
                const loc = SITE_URL + '/' + prefix + en.name.replace(/\.html?$/i, '');
                if (!__seoSeen.has(loc)) { __seoSeen.add(loc); urls.push({ loc: loc, priority: '0.5', changefreq: 'monthly', lastmod: today }); __seoExtra++; }
            }
        });
    };
    __walk(ROOT, '');
})();
if (__seoExtra) console.log('sitemap：SEO 修复补录 ' + __seoExtra + ' 个静态页');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `    <url>
        <loc>${esc(u.loc)}</loc>
        <lastmod>${u.lastmod || today}</lastmod>
        <changefreq>${u.changefreq}</changefreq>
        <priority>${u.priority}</priority>
    </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');

/* ---------- 清理孤儿页面 ----------
   case/ 是产物目录：删掉案例、后台改了 slug、或导入时改了网址名之后，
   旧的 html 不会自己消失。留着就是能被正常访问到的重复内容页（还会被爬虫收录），
   所以每次生成完按当前 slug 名单清一遍。
   安全兜底：名单为空（比如 data.js 读挂了）时一律不删，避免误清空整个目录。 */
const validPages = new Set(ordered.map(p => p.slug + '.html'));
if (validPages.size > 0 && fs.existsSync(outDir)) {
    const orphans = fs.readdirSync(outDir).filter(f => f.endsWith('.html') && !validPages.has(f));
    orphans.forEach(f => fs.unlinkSync(path.join(outDir, f)));
    if (orphans.length > 0) {
        console.log(`清理孤儿页面：${orphans.length} 个 → ${orphans.join('、')}`);
    }
}

console.log(`案例静态页：${ordered.length} 个 → case/`);
console.log(`跳过（缺 slug）：${skipped} 个`);
console.log(`sitemap.xml：${urls.length} 条 URL`);
