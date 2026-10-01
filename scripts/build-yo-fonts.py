"""Build correctly annotated 喲 glyphs from the bundled OFL fonts.

The upstream fonts annotate 喲 with ㄧㄠ. This lesson uses ㄧㄛ, so the
generated subset replaces only the annotation component and keeps the
original character outline, spacing, and vertical layout.
"""

from pathlib import Path

from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = ROOT / "public" / "fonts"
SOURCE_DIR = ROOT / "assets" / "font-sources"
FONTS = (
    ("BpmfZihiSans-Regular.ttf", "KidLessonYoSans.woff2", "Kid Lesson Yo Sans"),
    ("BpmfZihiOnly-R.ttf", "KidLessonYoOnly.woff2", "Kid Lesson Yo Only"),
)


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

    output_path = FONT_DIR / output_name
    font.flavor = "woff2"
    font.save(output_path)
    check = TTFont(output_path)
    corrected = check["glyf"][check.getBestCmap()[ord("喲")]]
    assert any(component.glyphName == "zyo" for component in corrected.components)
    assert not any(component.glyphName == "z_yao1" for component in corrected.components)
    print(f"{output_path.name}: {output_path.stat().st_size:,} bytes")


if __name__ == "__main__":
    for source, output, family in FONTS:
        build(source, output, family)
