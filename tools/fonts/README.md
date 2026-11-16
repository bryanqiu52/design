# 官网正文字体 MiSans 子集化

官网正文用小米 **MiSans 可变字体**（免费商用）。完整字体约 20MB，直接用会拖慢首屏，
所以裁成「常用字单文件 woff2」（约几百 KB）放在 `vendor/fonts/MiSansVF.woff2`。

## 字体从哪来

- 原始可变字体：`MiSansVF.ttf`（20MB），来自小米官方，经 dsrkafuu/misans 仓库转存：
  https://github.com/dsrkafuu/misans （路径 `raw/Normal/MiSansVF.ttf`）
- 官方字体主页 / 授权说明：https://hyperos.mi.com/font/zh/
- 授权条件：免费商用；**须注明使用了 MiSans**（已加在页脚）；不得单独售卖字体文件本身。

## 以后要补字怎么办（基本用不上）

字集 = 3500 常用字（GB2312 一级）+ 标点 + 站内固定文案，覆盖日常 99.7%+。
新文章冒出字集外的生僻字时，会自动回退到系统字体（苹方 / 微软雅黑），**不会出现豆腐块，不影响发布**。
只有当你发现某个高频字显示成系统字体、看着不顺眼，才需要补字重跑一次：

1. 把要补的字加进 `chars.txt`
2. 装工具：`pip install fonttools brotli`
3. 准备好原始 `MiSansVF.ttf` 放在本目录（或用环境变量 `MISANS_SRC` 指到别处）
4. 跑：`python build-subset.py`
5. 产物覆盖 `vendor/fonts/MiSansVF.woff2`，重新部署官网即可

## CSS 接线

`styles.css` 顶部 `@font-face` 引用 `vendor/fonts/MiSansVF.woff2`，`body` 字体栈首选 `MiSans VF`。
`font-display: swap` 保证字体没下载完时先用系统字体顶上，不白屏。
`@font-face` 的 `font-weight: 150 700` 就是字体本身的 wght 轴范围，不做假映射：
正文默认 400 落在轴值 400（比字体默认的 330 更实一点），标题 700 落到轴最粗档。

> 体积说明：子集后约 **1.3 MB**（3909 字）。比"只留一个字重"的方案（约 500 KB/档）大，
> 因为保留了可变轴——换来的好处是以后想调粗细只改 CSS 一行，不用重新生成字体。
> 若哪天嫌大，可改成只保留 400+700 两档静态文件（合计约 1 MB），代价是中间字重不可用。
