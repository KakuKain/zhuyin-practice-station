"""Rebuild deployable WOFF2 fonts from the preserved, OFL-licensed TTF sources."""
from pathlib import Path
from fontTools.ttLib import TTFont
from runpy import run_path

ROOT = Path(__file__).resolve().parents[1]
for source, target in (
    ("BpmfZihiSans-Regular.ttf", "BpmfZihiSans-Regular.woff2"),
    ("BpmfZihiOnly-R.ttf", "BpmfZihiOnly-R.woff2"),
):
    font = TTFont(ROOT / "assets" / "font-sources" / source)
    font.flavor = "woff2"
    font.save(ROOT / "public" / "fonts" / target)
run_path(str(ROOT / "scripts" / "build-yo-fonts.py"), run_name="__main__")
