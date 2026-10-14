"""Cut the six standing children for 比高矮 out of one sheet painted with ChatGPT.

The sheet (assets/artwork/kids/sheet.png) has six children in a row on a transparent page, each in
a shirt of one of the 第二課 palette colours, in palette order: 粉紅, 藍, 綠, 黃, 紫, 橘. Each child
is cropped tight from the top of the hair to the soles of the shoes, so a picture's height is the
child's height, and saved as assets/artwork/kids/<name>.png (the editable original) and
public/course-art/kid-<name>.webp (what the app loads). Their sizes go to
features/math/kid-pictures.json with the part of each child that may grow or shrink (BODY), so
children of different heights keep heads of the same size.

    python3 scripts/slice-kids.py assets/artwork/kids/sheet.png
"""

from pathlib import Path
import json
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
# compare-round.ts `palette`, in order.
NAMES = ["pink", "blue", "green", "yellow", "purple", "orange"]
# The part of each child that grows or shrinks, as fractions of the picture's height: from just
# below the chin to the socks above the shoes. Real classmates of different heights have heads
# and shoes of about the same size; the difference is in the body and legs. Measured by eye.
BODY = {
    "pink": (0.40, 0.865),
    "blue": (0.39, 0.86),
    "green": (0.39, 0.855),
    "yellow": (0.39, 0.855),
    "purple": (0.455, 0.875),
    "orange": (0.41, 0.875),
}
# Children show at up to about 400 CSS px tall; the sheet's own size is enough for sharp screens.
QUALITY = 88


def columns(alpha: Image.Image) -> list[tuple[int, int]]:
    """The runs of columns with paint in them: one per child, split by the transparent gaps."""
    width, height = alpha.size
    pixels = alpha.load()
    painted = [any(pixels[x, y] > 16 for y in range(height)) for x in range(width)]
    runs, start = [], None
    for x, filled in enumerate(painted + [False]):
        if filled and start is None:
            start = x
        elif not filled and start is not None:
            runs.append((start, x))
            start = None
    # Stray specks are not children.
    return [run for run in runs if run[1] - run[0] > width // 40]


def main(sheet_path: str) -> None:
    sheet = Image.open(sheet_path).convert("RGBA")
    alpha = sheet.getchannel("A")
    runs = columns(alpha)
    if len(runs) != len(NAMES):
        raise SystemExit(f"Found {len(runs)} children, expected {len(NAMES)}.")
    originals = ROOT / "assets" / "artwork" / "kids"
    originals.mkdir(parents=True, exist_ok=True)
    sizes = {}
    for name, (left, right) in zip(NAMES, runs):
        top, bottom = alpha.crop((left, 0, right, sheet.height)).getbbox()[1::2]
        child = sheet.crop((left, top, right, bottom))
        child.save(originals / f"{name}.png")
        child.save(ROOT / "public" / "course-art" / f"kid-{name}.webp", "WEBP", quality=QUALITY)
        sizes[name] = {"width": child.width, "height": child.height, "body": list(BODY[name])}
        print(f"{name}: {child.width} × {child.height}")
    target = ROOT / "features" / "math" / "kid-pictures.json"
    # Written the way Prettier formats it, so the format check passes without a rewrite.
    text = json.dumps(sizes, indent=2)
    for size in sizes.values():
        text = text.replace(
            json.dumps(size["body"], indent=2).replace("\n", "\n    "), json.dumps(size["body"])
        )
    target.write_text(text + "\n", encoding="utf-8")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "assets" / "artwork" / "kids" / "sheet.png"))
