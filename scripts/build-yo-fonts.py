"""Build correctly annotated 喲 glyphs from the bundled OFL fonts.

The upstream fonts annotate 喲 with ㄧㄠ. This lesson uses ㄧㄛ, so the
generated subset replaces only the annotation component and keeps the
original character outline, spacing, and vertical layout.
"""

from pathlib import Path
import json
import re

from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools import subset
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = ROOT / "public" / "fonts"
SOURCE_DIR = ROOT / "assets" / "font-sources"
FONTS = (
    ("BpmfZihiSans-Regular.ttf", "KidLessonYoSans.woff2", "Kid Lesson Yo Sans"),
    ("BpmfZihiOnly-R.ttf", "KidLessonYoOnly.woff2", "Kid Lesson Yo Only"),
)


def app_characters() -> set[int]:
    """Subset from all checked-in UI/data text, including pronunciation selectors.

    Keep the editable full fonts in assets/font-sources. Rebuild after adding text.
    Cmap format 14 and dependent annotation glyphs are retained by fontTools.
    """
    characters = set(range(32, 127)) | set(range(0x3000, 0x3040))
    characters |= set(range(0x3105, 0x312A)) | {0x2C7, 0x2CA, 0x2CB, 0x2D9, 0xE01E1}
    for directory in ("features", "components", "app"):
        for path in (ROOT / directory).rglob("*"):
            if path.suffix in (".ts", ".tsx"):
                text = path.read_text(encoding="utf-8")
                characters.update(ord(char) for char in text)
                characters.update(int(value, 16) for value in re.findall(r"\\u\{([0-9A-Fa-f]+)\}", text))
    return characters


ZHUYIN = dict(
    zyb="ㄅ", zyp="ㄆ", zym="ㄇ", zyf="ㄈ", zyd="ㄉ", zyt="ㄊ", zyn="ㄋ", zyl="ㄌ", zyg="ㄍ",
    zyk="ㄎ", zyh="ㄏ", zyj="ㄐ", zyq="ㄑ", zyx="ㄒ", zyzh="ㄓ", zych="ㄔ", zysh="ㄕ", zyr="ㄖ",
    zyz="ㄗ", zyc="ㄘ", zys="ㄙ", zya="ㄚ", zyo="ㄛ", zye="ㄜ", zyeh="ㄝ", zyai="ㄞ", zyei="ㄟ",
    zyao="ㄠ", zyou="ㄡ", zyan="ㄢ", zyen="ㄣ", zyang="ㄤ", zyeng="ㄥ", zyer="ㄦ", zyi="ㄧ",
    zyu="ㄨ", zyiu="ㄩ", tone2="ˊ", tone3="ˇ", tone4="ˋ",
)


def readings(font: TTFont) -> dict[str, str]:
    """What each character, and each variation sequence, shows as its annotation."""
    glyf = font["glyf"]
    cmap = font.getBestCmap()

    def components(name: str) -> list[str]:
        glyph = glyf[name]
        return [part.glyphName for part in glyph.components] if glyph.isComposite() else []

    def annotation(name: str) -> str | None:
        part = next((c for c in components(name) if c.startswith("z_")), None)
        if part is None:
            return None
        parts = components(part)
        text = "".join(ZHUYIN.get(c, "") for c in parts)
        return ("˙" + text) if "tone5" in parts else text

    shown: dict[str, str] = {}
    for code, name in cmap.items():
        if (value := annotation(name)) is not None:
            shown[chr(code)] = value
    for table in font["cmap"].tables:
        if table.format == 14:
            for selector, pairs in table.uvsDict.items():
                for code, name in pairs:
                    value = annotation(name or cmap[code])
                    if value is not None:
                        shown[chr(code) + chr(selector)] = value
    return dict(sorted(shown.items()))


def build(source_name: str, output_name: str, family_name: str) -> None:
    font = TTFont(SOURCE_DIR / source_name, recalcBBoxes=False)
    glyph_name = font.getBestCmap()[ord("喲")]
    original = font["glyf"][glyph_name]
    annotation = next(
        component for component in original.components if component.glyphName == "z_yao1"
    )
    pen = TTGlyphPen(font.getGlyphSet())
    for part in font["glyf"]["z_yo1"].components:
        pen.addComponent(
            part.glyphName,
            (1, 0, 0, 1, annotation.x + part.x, annotation.y + part.y),
        )
    for component in original.components:
        if component is not annotation:
            pen.addComponent(component.glyphName, (1, 0, 0, 1, component.x, component.y))
    corrected_glyph = pen.glyph()
    corrected_glyph.xMin = original.xMin
    corrected_glyph.xMax = original.xMax
    corrected_glyph.yMin = original.yMin
    corrected_glyph.yMax = original.yMax
    font["glyf"][glyph_name] = corrected_glyph

    postscript_name = family_name.replace(" ", "")
    for record in font["name"].names:
        replacement = {
            1: family_name,
            3: f"{family_name} 1.0; corrected yo annotation",
            4: family_name,
            6: postscript_name,
            16: family_name,
            17: "Regular",
        }.get(record.nameID)
        if replacement is not None:
            record.string = replacement.encode(record.getEncoding())

    # Keep contextual variants and glyph names, not just the default Han glyphs.
    options = subset.Options()
    options.layout_features = ["*"]
    options.glyph_names = True
    options.name_IDs = ["*"]
    options.name_legacy = True
    options.name_languages = ["*"]
    subsetter = subset.Subsetter(options=options)
    characters = app_characters()
    source_cmap = font.getBestCmap()
    subsetter.populate(unicodes=characters)
    subsetter.subset(font)
    assert set(source_cmap).intersection(characters) <= set(font.getBestCmap())
    for selector in characters.intersection(range(0xE0100, 0xE01F0)):
        assert any(table.format == 14 and selector in table.uvsDict for table in font["cmap"].tables)

    output_path = FONT_DIR / output_name
    font.flavor = "woff2"
    font.save(output_path)
    check = TTFont(output_path)
    corrected = check["glyf"][check.getBestCmap()[ord("喲")]]
    assert any(component.glyphName == "zyo" for component in corrected.components)
    assert not any(component.glyphName == "z_yao1" for component in corrected.components)
    # Lets unit tests prove every answer glyph and annotated sentence shows its reading.
    snapshot = SOURCE_DIR / output_name.replace(".woff2", "-readings.json")
    snapshot.write_text(
        json.dumps(readings(check), ensure_ascii=False, indent=0) + "\n", encoding="utf-8"
    )
    print(f"{output_path.name}: {output_path.stat().st_size:,} bytes")


if __name__ == "__main__":
    for source, output, family in FONTS:
        build(source, output, family)
