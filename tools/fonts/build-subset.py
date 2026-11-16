# -*- coding: utf-8 -*-
"""
把 MiSans 可变字体裁成官网正文用的单文件 woff2。
用法：python build-subset.py
依赖：pip install fonttools brotli
原始字体：本目录下的 MiSansVF.ttf，或环境变量 MISANS_SRC 指定的路径。
"""
import os
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
CHARS = HERE / "chars.txt"
OUT = REPO / "vendor" / "fonts" / "MiSansVF.woff2"

src = os.environ.get("MISANS_SRC") or str(HERE / "MiSansVF.ttf")
if not Path(src).exists():
    sys.exit(f"找不到原始字体：{src}\n请放到 tools/fonts/MiSansVF.ttf 或设置 MISANS_SRC")
if not CHARS.exists():
    sys.exit(f"找不到字符表：{CHARS}")

text = CHARS.read_text(encoding="utf-8")
# 关键：保留可变字重轴。--layout-features='*' 保 OpenType 特性。
options = subset.Options()
options.flavor = "woff2"
options.desubroutinize = False
options.layout_features = ["*"]
options.name_IDs = ["*"]
options.name_legacy = True
options.name_languages = ["*"]
options.notdef_outline = True
options.recalc_bounds = True
options.drop_tables += []

font = subset.load_font(src, options)
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=text)
subsetter.subset(font)

OUT.parent.mkdir(parents=True, exist_ok=True)
subset.save_font(font, str(OUT), options)

kb = OUT.stat().st_size / 1024
print(f"OK -> {OUT}  ({kb:.0f} KB, {len(text)} chars)")
