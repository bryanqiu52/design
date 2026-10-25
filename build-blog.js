/* build-blog.js
 * 博客静态页 + 索引生成器
 *
 * 运行：node build-blog.js（ESA Pages 每次 push 后自动执行；也可手动跑）
 *
 * 唯一真源：blog/posts/*.md（含 frontmatter）
 * 产物（全部自动生成，不要手改）：
 *   1. blog/<slug>.html      —— 每篇文章的真静态页（正文写死在 HTML 里，爬虫不跑 JS 也能读）
 *   2. blog/index.json       —— 文章索引（含完整元数据）
 *   3. blog/index-data.js    —— window.__blogIndex，给 blog.html 列表页与首页用
 *   4. sitemap.xml           —— 追加/刷新博客 URL
 *
 * 设计要点：
 *   - 静态页的正文在构建时就用 marked 渲染成 HTML 写死，SEO 最优
 *   - 元数据只此一处（frontmatter），不再硬编码进任何 HTML
 *   - 删文章后产生的孤儿静态页会被清理
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE_URL = 'https://www.xifofly.com';
const POSTS_DIR = path.join(ROOT, 'blog', 'posts');
const OUT_DIR = path.join(ROOT, 'blog');

/* ---------- 加载依赖：marked（复用 vendor 里的，保持前端一致） ---------- */
let marked = null;
try {
    marked = require(path.join(ROOT, 'vendor', 'marked', 'marked.min.js'));
} catch (e) {
    try {
        marked = require('marked');
    } catch (e2) {
        marked = null;
    }
}

/* ---------- 站点配置 ---------- */
function loadSiteConfig() {
    try {
        const src = fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8');
        return new Function(src + '\nreturn siteConfig;')();
    } catch (e) {
        return {};
    }
}
const siteConfig = loadSiteConfig();

/* ---------- 工具函数 ---------- */
function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function escAttr(s) { return esc(s); }

/* ---------- 响应式图片（srcset）----------
 * 800px 变体由 xifofly-writer 的 temp/_a-srcset.js 批量生成，命名固定 xxx-800w.webp。
 * 读 WebP 头拿原图真实宽度，把「800w 变体 + 原图」一起写进 srcset：手机取小图，
 * 桌面 / 视网膜屏取原图。变体不存在或宽度读不出来就整条不写（宁缺勿错）。
 * 与 build-static.js 里的同名函数保持一致。 */
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
function srcsetOf(src, sizes) {
    const s = String(src || '');
    if (!/\.webp$/i.test(s)) return '';
    const abs = path.join(ROOT, s.replace(/^\/+/, ''));
    const small = abs.replace(/\.webp$/i, '-800w.webp');
    if (!fs.existsSync(small) || !fs.existsSync(abs)) return '';
    const w = webpWidth(abs);
    if (!w || w <= 800) return '';
    const relSmall = path.relative(ROOT, small).split(path.sep).join('/');
    return ` srcset="${esc(relSmall)} 800w, ${esc(s)} ${w}w" sizes="${esc(sizes || '(max-width: 900px) 100vw, 900px')}"`;
}

/* 极简 frontmatter 解析：--- 包裹的 key: value（值可带引号） */
function parseFrontmatter(raw) {
    const m = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
    const meta = {};
    let body = raw;
    if (m) {
        body = raw.slice(m[0].length);
        m[1].split(/\r?\n/).forEach(line => {
            const mm = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
            if (!mm) return;
            let v = mm[2].trim();
            // 与写作工具的 yamlVal 对齐：写入时 \ → \\ 、" → \"，读回来要反转，
            // 否则标题里的引号会带着斜杠上线上页
            let dq = false;
            if (v.startsWith('"') && v.endsWith('"')) { v = v.slice(1, -1); dq = true; }
            else if (v.startsWith("'") && v.endsWith("'")) { v = v.slice(1, -1); }
            if (dq) v = v.replace(/\\(["\\])/g, '$1');
            if (v.startsWith('[') && v.endsWith(']')) {
                try { v = JSON.parse(v.replace(/'/g, '"')); } catch (e) { /* 保留原串 */ }
            }
            meta[mm[1]] = v;
        });
    }
    return { meta, body: body.trim() };
}

/* Markdown -> HTML（返回 { html, headings }） */
function renderMarkdown(body) {
    let html;
    if (marked && typeof marked.parse === 'function') {
        try {
            if (marked.setOptions) marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });
            html = marked.parse(body);
        } catch (e) { html = null; }
    }
    if (html == null) html = '<pre>' + esc(body) + '</pre>';
    return normalizeTaskList(html);
}

/* 给任务列表项加 task-list-item 类（marked 只输出 <li><input ...>），
 * 便于 CSS 精准控制勾选框样式 */
function normalizeTaskList(html) {
    return html.replace(/<li>(\s*<input[^>]*type="checkbox"[^>]*>)/gi, '<li class="task-list-item">$1');
}

/* 给 h2/h3 加锚点 id，并提取目录 */
function buildTocAndIds(html) {
    const items = [];
    let idx = 0;
    const out = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (all, level, inner) => {
        const text = inner.replace(/<[^>]+>/g, '').trim();
        const id = 'blog-sec-' + idx++;
        items.push({ id, tag: 'h' + level, text });
        return `<h${level} id="${id}">${inner}</h${level}>`;
    });
    return { html: out, items };
}

/* 首个非空段加 lead 样式（与旧详情页一致） */
function markLead(html) {
    return html.replace(/<p>(\s*[^<\s][\s\S]*?)<\/p>/, (all, inner) => {
        return `<p class="blog-lead">${inner}</p>`;
    });
}

function estimateReadMinutes(html) {
    const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, '');
    return Math.max(1, Math.round(text.length / 300));
}

/* 正文字数（不含标记、不含空白）：给搜索引擎做"篇幅/深度"信号 */
function countWords(html) {
    return html.replace(/<[^>]+>/g, '').replace(/\s+/g, '').length;
}

/* 取 .md 文件的最后修改日期（YYYY-MM-DD）。
 * 用途：JSON-LD 的 dateModified —— 只改错别字重发时，靠它告诉搜索引擎"这篇更新过"。 */
function fileModifiedDate(filePath) {
    try {
        const t = fs.statSync(filePath).mtime;
        const p = n => String(n).padStart(2, '0');
        return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
    } catch (e) { return ''; }
}

function fmtDateCN(d) {
    if (!d) return '';
    const parts = String(d).split('-');
    if (parts.length === 3) return `${parts[0]} - ${parts[1]} ${parts[2]}`;
    return d;
}

/* ---------- 扫描文章 ---------- */
if (!fs.existsSync(POSTS_DIR)) {
    console.error('找不到 blog/posts/ 目录，退出');
    process.exit(1);
}

const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
const posts = [];

files.forEach(fileName => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, fileName), 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    const slug = meta.slug || fileName.replace(/\.md$/, '');
    const rendered = renderMarkdown(body);
    const tocRes = buildTocAndIds(rendered);
    const finalHtml = markLead(tocRes.html);
    posts.push({
        slug,
        fileName,
        title: meta.title || slug,
        date: meta.date || '',
        category: meta.category || '设计',
        author: meta.author || (siteConfig.company || '溪风设计'),
        cover: meta.cover || '',
        coverAlt: meta.coverAlt || '',
        excerpt: meta.excerpt || '',
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        bodyHtml: finalHtml,
        toc: tocRes.items,
        readMinutes: estimateReadMinutes(rendered),
        wordCount: countWords(finalHtml),
        modified: fileModifiedDate(path.join(POSTS_DIR, fileName))
    });
});

/* 按日期降序 */
posts.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));

/* ---------- 页面模板：文章静态页 ---------- */
function postPage(p, prev, next, related) {
    /* 干净 URL：站点在 ESA 上会把 .html 去掉（307 跳转），对外地址一律不带 .html；
       磁盘文件名仍是 <slug>.html 不变 */
    const url = `${SITE_URL}/blog/${p.slug}`;
    const title = `${p.title} - 溪风设计 XIFOFLY`;
    const desc = p.excerpt || `${p.title}｜溪风设计（XIFOFLY）设计干货分享。`;

    const tocHtml = p.toc.length ? `
                <nav class="sidebar-section toc" id="blogToc">
                    <h3><i class="fas fa-list-ul"></i> 文章目录</h3>
                    <ul>
                        ${p.toc.map(it => `<li class="toc-${it.tag}"><a href="#${it.id}">${esc(it.text)}</a></li>`).join('\n                        ')}
                    </ul>
                </nav>` : '';

    const relatedHtml = related.map(r => `
                        <a href="blog/${esc(r.slug)}" class="sidebar-post-item related-post">
                            <div class="sidebar-post-image">
                                <img src="${esc(r.cover)}"${srcsetOf(r.cover, '(max-width: 900px) 30vw, 280px')} alt="${esc(r.coverAlt || r.title)}" loading="lazy">
                            </div>
                            <div class="sidebar-post-info">
                                <span class="sidebar-post-category">${esc(r.category)}</span>
                                <h4>${esc(r.title)}</h4>
                            </div>
                        </a>`).join('\n');

    const ld = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        'headline': p.title,
        'description': desc,
        'datePublished': p.date || undefined,
        'dateModified': p.modified || p.date || undefined,
        'articleSection': p.category || undefined,
        'keywords': [p.category].concat(p.tags || []).filter(Boolean).join(',') || undefined,
        'wordCount': p.wordCount || undefined,
        'inLanguage': 'zh-CN',
        'author': { '@type': 'Person', 'name': p.author },
        'publisher': {
            '@type': 'Organization',
            'name': siteConfig.company || '溪风设计',
            'url': SITE_URL
        },
        'mainEntityOfPage': { '@type': 'WebPage', '@id': url },
        'image': p.cover ? [`${SITE_URL}/${p.cover}`] : undefined
    };
    const jsonLd = '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<base href="../"/>
<title>${esc(title)}</title>
<meta name="description" content="${escAttr(desc)}"/>
<meta name="keywords" content="${escAttr([p.title, p.category].concat(p.tags || []).concat(['溪风设计', 'XIFOFLY']).join(','))}"/>
<meta property="og:title" content="${escAttr(p.title)}"/>
<meta property="og:description" content="${escAttr(desc)}"/>
<meta property="og:type" content="article"/>
<meta property="og:url" content="${escAttr(url)}"/>
${p.cover ? `<meta property="og:image" content="${escAttr(SITE_URL + '/' + p.cover)}"/>` : ''}
${p.cover ? `<meta property="og:image:alt" content="${escAttr(p.coverAlt || p.title)}"/>` : ''}
<meta property="og:site_name" content="溪风设计 XIFOFLY"/>
<meta property="og:locale" content="zh_CN"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="canonical" href="${escAttr(url)}"/>
${jsonLd}
<link href="vendor/fontawesome/css/all.min.css" rel="stylesheet"/>
<link href="styles.css" rel="stylesheet"/>
<link rel="icon" id="site-favicon"/>
</head>
<body>
<canvas id="spark-canvas"></canvas>
<script src="js/spark.js"></script>

<div id="site-nav"></div>

<article class="blog-detail" id="blogDetail">
    <header class="blog-detail-header">
        <div class="container">
            <nav class="breadcrumb" aria-label="面包屑导航">
                <a href="./">首页</a>
                <span class="breadcrumb-sep">›</span>
                <a href="blog">博客</a>
                <span class="breadcrumb-sep">›</span>
                <span class="breadcrumb-current">${esc(p.title)}</span>
            </nav>
            <span class="blog-detail-category">${esc(p.category)}</span>
            <h1>${esc(p.title)}</h1>
            <div class="blog-detail-meta">
                <span class="blog-detail-author">
                    <span class="author-avatar">${esc((p.author || '设').charAt(0))}</span>
                    ${esc(p.author)}
                </span>
                <span class="meta-dot">·</span>
                <span class="blog-detail-date"><i class="far fa-calendar-alt"></i> ${esc(fmtDateCN(p.date))}</span>
                <span class="meta-dot">·</span>
                <span class="blog-detail-readtime"><i class="far fa-clock"></i> ${p.readMinutes} 分钟阅读</span>
            </div>
            ${(p.tags && p.tags.length) ? `<div class="blog-detail-tags">
                ${p.tags.map(t => `<span class="blog-tag">${esc(t)}</span>`).join('\n                ')}
            </div>` : ''}
        </div>
    </header>

    ${p.cover ? `<div class="blog-detail-image">
        <img src="${esc(p.cover)}"${srcsetOf(p.cover, '(max-width: 900px) 100vw, 900px')} alt="${esc(p.coverAlt || p.title)}"
             onerror="this.style.display='none'; let p=this.closest('.blog-detail-image'); if(p) p.classList.add('img-placeholder');">
    </div>` : ''}

    <div class="container article-container">
        <div class="blog-detail-wrapper">
            <section class="blog-detail-content">
${p.bodyHtml}
            </section>

            <aside class="blog-sidebar">
${tocHtml}
            </aside>
        </div>
    </div>

    <section class="blog-detail-end">
        <div class="container">
            <nav class="blog-pager" aria-label="上一篇 / 下一篇">
                ${prev ? `<a class="blog-pager-link prev" href="blog/${esc(prev.slug)}">
                    <span class="pager-label"><i class="fas fa-arrow-left"></i> 上一篇</span>
                    <span class="pager-title">${esc(prev.title)}</span>
                </a>` : '<span class="blog-pager-link placeholder"></span>'}
                ${next ? `<a class="blog-pager-link next" href="blog/${esc(next.slug)}">
                    <span class="pager-label">下一篇 <i class="fas fa-arrow-right"></i></span>
                    <span class="pager-title">${esc(next.title)}</span>
                </a>` : '<span class="blog-pager-link placeholder"></span>'}
            </nav>
            ${relatedHtml ? `<div class="related-posts">
                <h3 class="related-posts-title"><i class="fas fa-file-alt"></i> 相关文章</h3>
                <div class="related-posts-grid">
${relatedHtml}
                </div>
            </div>` : ''}
            <div class="blog-end-back">
                <a href="blog" class="btn btn-outline">
                    <i class="fas fa-arrow-left"></i> 返回博客列表
                </a>
            </div>
        </div>
    </section>
</article>

<div id="site-footer"></div>

<script src="js/config.js"></script>
<script src="js/site-ui.js"></script>
<script src="js/seo.js"></script>
<script src="js/spark.js"></script>
<script>
/* 目录点击平滑滚动 + 滚动高亮（静态页内联，无需额外文件） */
(function () {
    var toc = document.getElementById('blogToc');
    if (!toc) return;
    var links = toc.querySelectorAll('a');
    links.forEach(function (a) {
        a.addEventListener('click', function (e) {
            e.preventDefault();
            var id = a.getAttribute('href').slice(1);
            var el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
    var headings = Array.prototype.slice.call(document.querySelectorAll('.blog-detail-content h2, .blog-detail-content h3'));
    if (!headings.length || !('IntersectionObserver' in window)) return;
    var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            links.forEach(function (a) { a.classList.remove('active'); });
            var active = toc.querySelector('a[href="#' + en.target.id + '"]');
            if (active) active.classList.add('active');
        });
    }, { rootMargin: '-80px 0px -70% 0px' });
    headings.forEach(function (h) { obs.observe(h); });
})();
</script>
</body>
</html>
`;
}

/* 相关文章：同分类优先，取 3 篇 */
function relatedOf(p, all) {
    const same = all.filter(x => x.slug !== p.slug && x.category === p.category);
    const other = all.filter(x => x.slug !== p.slug && x.category !== p.category);
    return same.concat(other).slice(0, 3);
}

/* ---------- 生成静态页 ---------- */
posts.forEach((p, i) => {
    const prev = i < posts.length - 1 ? posts[i + 1] : null;
    const next = i > 0 ? posts[i - 1] : null;
    fs.writeFileSync(
        path.join(OUT_DIR, p.slug + '.html'),
        postPage(p, prev, next, relatedOf(p, posts)),
        'utf8'
    );
});

/* ---------- 生成索引 ---------- */
const indexArr = posts.map(p => ({
    slug: p.slug,
    fileName: p.fileName,
    title: p.title,
    date: p.date,
    category: p.category,
    author: p.author,
    cover: p.cover,
    coverAlt: p.coverAlt,
    excerpt: p.excerpt,
    tags: p.tags
}));

fs.writeFileSync(
    path.join(OUT_DIR, 'index.json'),
    JSON.stringify(indexArr, null, 4),
    'utf8'
);

fs.writeFileSync(
    path.join(OUT_DIR, 'index-data.js'),
    '// 自动生成，请勿手动编辑。单一数据源=blog/posts/*.md\n' +
    'window.__blogIndex = ' + JSON.stringify(indexArr, null, 4) + ';\n',
    'utf8'
);

/* posts-data.js 已废弃：旧详情页 blog-detail.html 已删除，文章全文只由静态页承载 */

/* ---------- 更新 sitemap：刷新博客 URL ---------- */
const sitemapPath = path.join(ROOT, 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
    let xml = fs.readFileSync(sitemapPath, 'utf8');
    const today = new Date().toISOString().slice(0, 10);
    /* 先移除旧的博客详情条目（/blog/<slug>）。注意匹配必须是 /blog/ 带斜杠，
       否则会把博客列表页 /blog 本身也一并删掉（历史 bug）。 */
    xml = xml.replace(/\s*<url>\s*<loc>[^<]*\/blog\/[^<]*<\/loc>[\s\S]*?<\/url>/g, '');
    const blogUrls = posts.map(p => `    <url>
        <loc>${SITE_URL}/blog/${p.slug}</loc>
        <lastmod>${p.modified || p.date || today}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
    </url>`).join('\n');
    xml = xml.replace('</urlset>', blogUrls + '\n</urlset>');
    fs.writeFileSync(sitemapPath, xml, 'utf8');
    console.log(`sitemap.xml：博客 URL ${posts.length} 条已刷新`);
} else {
    console.warn('未找到 sitemap.xml，跳过');
}

/* ---------- 清理孤儿静态页 ---------- */
const validPages = new Set(posts.map(p => p.slug + '.html'));
if (validPages.size > 0) {
    const orphans = fs.readdirSync(OUT_DIR).filter(f =>
        f.endsWith('.html') && !validPages.has(f)
    );
    orphans.forEach(f => fs.unlinkSync(path.join(OUT_DIR, f)));
    if (orphans.length) console.log(`清理孤儿静态页：${orphans.join('、')}`);
}

console.log(`博客静态页：${posts.length} 篇 → blog/`);
posts.forEach(p => console.log(`  · blog/${p.slug}.html  《${p.title}》`));
console.log('索引：index.json / index-data.js 已更新');
