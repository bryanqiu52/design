/* build-lists.js
 * 列表页静态预渲染器（首页 / cases / blog 三个列表页）
 *
 * 为什么要有它：
 *   三个列表页原来是「空壳 + JS 拉数据渲染」，curl 抓原始 HTML 拿不到一条内容链接，
 *   58 个详情页（48 案例 + 5 博客 + …）对蜘蛛来说全是孤岛 —— 百度 10 天 0 收录就是这个原因。
 *   这里在构建时把列表数据直接写进 HTML，爬虫不跑 JS 也能顺着链接爬到每个内容页。
 *
 * 怎么写的：
 *   三个页面各留一对锚点注释（<!-- list:xxx:start --> … <!-- list:xxx:end -->），
 *   本脚本只替换锚点之间那一段，页面其余部分一个字不动。
 *   锚点之间的内容是产物，不要手改；要改结构改这里。
 *
 * 首屏为什么只显示第一页：
 *   静态写进去的是全部条目（爬虫要能爬到全部），但超出第一页的加 style="display:none"，
 *   让静态首屏与页面 JS 渲染的第一页完全一致 —— 用户不会看到「先铺满 48 个再收回 8 个」的跳动，
 *   页面 JS 一执行就把整段替换成自己的分页渲染，交互、样式、URL 全都不变。
 *
 * 运行：
 *   node build-lists.js        手动跑
 *   或由 build-static.js / build-blog.js 在末尾自动调用（两条构建链路都覆盖，不用改部署配置）
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

/* 锚点表：一处定义，三处注入 */
const TARGETS = {
    cases: { file: 'cases.html', key: 'list:cases' },
    blog: { file: 'blog.html', key: 'list:blog' },
    featured: { file: 'index.html', key: 'list:featured' },
    homeBlog: { file: 'index.html', key: 'list:homeblog' }
};

/* 首屏条数必须与页面里的 JS 常量一致：
   cases.html 的 pageSize 默认 8；blog.html 的 BLOG_ITEMS_PER_PAGE = 3；首页博客取 4 篇。
   改了页面里的常量，这里跟着改，否则静态首屏和 JS 渲染会对不上（会闪一下）。 */
const CASES_PER_PAGE = 8;
const BLOG_PER_PAGE = 3;
const HOME_BLOG_COUNT = 4;

/* ---------- 工具 ---------- */
function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* 图片加载失败的兜底：与页面 JS 里生成的内联 onerror 保持一致 */
const IMG_ONERROR = "this.style.display='none'; if(this.parentElement) this.parentElement.classList.add('img-placeholder');";
const IMG_ONERROR_MINI = "this.style.display='none'; let p=this.closest('.blog-mini-image'); if(p) p.classList.add('img-placeholder');";
const IMG_ONERROR_BLOG = "this.style.display='none'; let p=this.closest('.blog-image'); if(p) p.classList.add('img-placeholder');";

/* ---------- 数据源 ---------- */
function loadSiteData() {
    global.window = global;                 /* data.js 里有 window 赋值，Node 环境先造一个 */
    const src = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
    return new Function(
        src + '\nreturn { projectsData: projectsData, featuredWorks: featuredWorks, sortProjects: sortProjects, getCategoryName: getCategoryName };'
    )();
}

function loadBlogIndex() {
    const p = path.join(ROOT, 'blog', 'index.json');
    if (!fs.existsSync(p)) return [];
    try {
        const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
        return Array.isArray(arr) ? arr : [];
    } catch (e) {
        console.warn('[列表静态化] 读取 blog/index.json 失败：' + e.message);
        return [];
    }
}

/* ---------- 片段生成 ---------- */

/* cases.html 的案例卡（结构与 renderWorks() 里生成的完全一致） */
function caseCard(w, cat, visible) {
    const href = w.slug ? 'case/' + w.slug : 'cases';
    const hidden = visible ? '' : ' style="display:none"';
    return `    <a href="${esc(href)}" class="portfolio-item" data-id="${esc(w.id)}"${hidden}>
        <div class="portfolio-item-image">
            <img src="${esc(w.image)}" alt="${esc(w.title)}" loading="lazy">
            <div class="portfolio-item-overlay">
                <span class="portfolio-item-category">${esc(cat)}</span>
            </div>
        </div>
        <div class="portfolio-item-info">
            <h3>${esc(w.title)}</h3>
            <p>${esc(w.subtitle || '')}</p>
            <span class="portfolio-item-link">
                查看详情 <i class="fas fa-arrow-right"></i>
            </span>
        </div>
    </a>`;
}

/* 首页精选案例卡（结构与 loadFeaturedWorks() 里生成的完全一致，带 data-animate） */
function featuredCard(w, cat, i) {
    return `        <a href="case/${esc(w.slug)}" class="portfolio-item" data-animate style="transition-delay: ${(i * 0.1).toFixed(1)}s">
            <div class="portfolio-item-image">
                <img src="${esc(w.image)}" alt="${esc(w.title)}" loading="lazy">
                <div class="portfolio-item-overlay">
                    <span class="portfolio-item-category">${esc(cat)}</span>
                </div>
            </div>
            <div class="portfolio-item-info">
                <h3>${esc(w.title)}</h3>
                <p>${esc(w.subtitle || '')}</p>
                <span class="portfolio-item-link">
                    查看详情 <i class="fas fa-arrow-right"></i>
                </span>
            </div>
        </a>`;
}

/* blog.html 的文章条目（结构与 renderBlogList() 里生成的完全一致） */
function blogItem(post, visible) {
    const slug = post.slug;
    const hidden = visible ? '' : ' style="display:none"';
    return `        <article class="news-item"${hidden}>
            <div class="news-image">
                <a href="blog/${esc(slug)}">
                    <img src="${esc(post.cover || '')}" alt="${esc(post.coverAlt || post.title || '')}" loading="lazy"
                         onerror="${IMG_ONERROR}">
                </a>
            </div>
            <div class="news-content">
                <h3><a href="blog/${esc(slug)}">${esc(post.title || '未命名文章')}</a></h3>
                <p>${esc(post.excerpt || '')}</p>
                <div class="news-meta">
                    <span class="news-author"><i class="fas fa-user"></i> ${esc(post.author || '')}</span>
                    <span class="news-date"><i class="far fa-calendar"></i> ${esc(post.date || '')}</span>
                    <span class="news-category">${esc(post.category || '')}</span>
                </div>
            </div>
            <div class="news-action">
                <a href="blog/${esc(slug)}" class="btn btn-primary btn-sm">阅读全文</a>
            </div>
        </article>`;
}

/* 首页博客区（结构与 loadBlogPosts() 里生成的完全一致：1 张大卡 + 3 张小卡） */
function homeBlogBlock(posts) {
    const latest = posts.slice(0, HOME_BLOG_COUNT);
    if (!latest.length) return '';
    const f = latest[0];
    const minis = latest.slice(1);
    return `        <article class="blog-card-featured" data-animate style="animation-delay: 0s">
            <a href="blog/${esc(f.slug)}" class="blog-image-link">
                <div class="blog-image">
                    <img src="${esc(f.cover || '')}" alt="${esc(f.coverAlt || f.title || '')}" loading="lazy"
                         onerror="${IMG_ONERROR_BLOG}">
                </div>
            </a>
            <div class="blog-content">
                <span class="blog-category">${esc(f.category || '')}</span>
                <h3><a href="blog/${esc(f.slug)}">${esc(f.title || '未命名文章')}</a></h3>
                <p>${esc(f.excerpt || '')}</p>
                <div class="blog-meta">
                    <span class="blog-author"><i class="fas fa-user"></i> ${esc(f.author || '')}</span>
                    <span class="blog-date"><i class="far fa-calendar"></i> ${esc(f.date || '')}</span>
                </div>
            </div>
        </article>
        <div class="blog-card-list">
${minis.map((post, i) => `            <article class="blog-card-mini" data-animate style="animation-delay: ${((i + 1) * 0.1).toFixed(1)}s" onclick="location.href='blog/${esc(post.slug)}'">
                <div class="blog-mini-image">
                    <img src="${esc(post.cover || '')}" alt="${esc(post.coverAlt || post.title || '')}" loading="lazy"
                         onerror="${IMG_ONERROR_MINI}">
                </div>
                <div class="blog-mini-content">
                    <span class="blog-mini-category">${esc(post.category || '')}</span>
                    <div class="blog-mini-title">${esc(post.title || post.slug || '未命名文章')}</div>
                    <div class="blog-mini-meta">
                        <span><i class="fas fa-user"></i> ${esc(post.author || '')}</span>
                        <span><i class="far fa-calendar"></i> ${esc(post.date || '')}</span>
                    </div>
                </div>
            </article>`).join('\n')}
        </div>`;
}

/* ---------- 注入 ---------- */
function inject(target, html, stat) {
    const abs = path.join(ROOT, target.file);
    if (!fs.existsSync(abs)) {
        console.warn(`[列表静态化] 找不到 ${target.file}，跳过`);
        return;
    }
    const src = fs.readFileSync(abs, 'utf8');
    const re = new RegExp('<!-- ' + target.key + ':start -->[\\s\\S]*?<!-- ' + target.key + ':end -->');
    if (!re.test(src)) {
        console.warn(`[列表静态化] ${target.file} 缺少 <!-- ${target.key}:start/end --> 锚点，跳过（页面结构被改过？）`);
        return;
    }
    /* 生成内容为空时一律不覆盖 —— 数据读挂了不能把页面清空 */
    if (!String(html).trim()) {
        console.warn(`[列表静态化] ${target.key} 生成内容为空，保留原内容不覆盖`);
        return;
    }
    const block = `<!-- ${target.key}:start -->\n${html}\n<!-- ${target.key}:end -->`;
    /* 用函数式替换，避免内容里出现 $& / $1 被当成替换模式 */
    const next = src.replace(re, function () { return block; });
    if (next === src) {
        stat.unchanged.push(target.key);
    } else {
        fs.writeFileSync(abs, next, 'utf8');
        stat.changed.push(target.key);
    }
}

/* ---------- 主流程 ---------- */
function buildLists() {
    const stat = { changed: [], unchanged: [], counts: {} };

    let data;
    try {
        data = loadSiteData();
    } catch (e) {
        console.warn('[列表静态化] 读取 js/data.js 失败，跳过：' + e.message);
        return stat;
    }
    const posts = loadBlogIndex();

    /* 案例：与 cases.html 的 sortProjects(projectsData) 同序，isTop 置顶优先 */
    const cases = data.sortProjects(data.projectsData).filter(w => w.slug);
    const casesHtml = cases.map((w, i) =>
        caseCard(w, data.getCategoryName(w.category), i < CASES_PER_PAGE)
    ).join('\n');
    stat.counts.cases = cases.length;

    /* 首页精选：featuredWorks 与首页 JS 同源（sortedProjects.slice(0,8)） */
    const featured = (data.featuredWorks || []).filter(w => w.slug);
    const featuredHtml = featured.map((w, i) =>
        featuredCard(w, data.getCategoryName(w.category), i)
    ).join('\n');
    stat.counts.featured = featured.length;

    /* 博客列表：全部写进去，第一页之外的隐藏 */
    const blogHtml = posts.filter(p => p && p.slug).map((p, i) =>
        blogItem(p, i < BLOG_PER_PAGE)
    ).join('\n');
    stat.counts.blog = posts.length;

    const homeBlogHtml = homeBlogBlock(posts);
    stat.counts.homeBlog = Math.min(posts.length, HOME_BLOG_COUNT);

    inject(TARGETS.cases, casesHtml, stat);
    inject(TARGETS.blog, blogHtml, stat);
    inject(TARGETS.featured, featuredHtml, stat);
    inject(TARGETS.homeBlog, homeBlogHtml, stat);

    console.log(`[列表静态化] cases ${stat.counts.cases} 条 / 首页精选 ${stat.counts.featured} 条 / 博客 ${stat.counts.blog} 条 / 首页博客 ${stat.counts.homeBlog} 条`);
    if (stat.changed.length) console.log(`[列表静态化] 已更新：${stat.changed.join('、')}`);
    else console.log('[列表静态化] 内容无变化');
    return stat;
}

module.exports = { buildLists };

if (require.main === module) buildLists();
