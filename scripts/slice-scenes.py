"""Cut the English dialogues' scenes out of one sheet painted with ChatGPT.

The sheet (assets/artwork/scenes/sheet.png) is a 3 × 3 grid of rounded picture panels on white,
row by row in the order of `NAMES`. The panels are found by the white gaps between them, trimmed
a little so their rounded white corners are left out (the page rounds the picture itself), and
saved as public/course-art/scenes/<dialogue>.webp. Then list the dialogues in `paintedScenes`
(features/english/english-lessons.ts).

    python3 scripts/slice-scenes.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
# The keys of englishDialogues, in the order the sheet was painted.
NAMES = [
    "hello", "good-morning", "listen",
    "look", "goodbye-bye", "goodbye-see-you",
    "sit-down", "thank-you", "my-turn",
]
COLUMNS, ROWS = 3, 3
# Scenes show at up to about 360 CSS px wide; twice that for sharp screens.
WIDTH = 720
QUALITY = 86
# How far each panel is trimmed, as a share of its size, to drop the rounded corners.
TRIM = 0.025


def panels(sheet: Image.Image, count: int, axis: int) -> list[tuple[int, int]]:
    """The spans of painted columns (axis 0) or rows (axis 1), split by the white gaps."""
    width, height = sheet.size
    pixels = sheet.load()
    across = range(0, height if axis == 0 else width, 2)
    length = width if axis == 0 else height
    painted = []
    for at in range(length):
        dots = (pixels[(at, other) if axis == 0 else (other, at)] for other in across)
        painted.append(sum(1 for dot in dots if min(dot) <= 242) > len(across) // 10)
    spans, start = [], None
    for at, filled in enumerate(painted + [False]):
        if filled and start is None:
            start = at
        elif not filled and start is not None:
            if at - start > length // (count * 3):
                spans.append((start, at))
            start = None
    if len(spans) != count:
        raise SystemExit(f"Found {len(spans)} panels across, expected {count}.")
    return spans


def main() -> None:
    sheet = Image.open(ROOT / "assets" / "artwork" / "scenes" / "sheet.png").convert("RGB")
    out = ROOT / "public" / "course-art" / "scenes"
    out.mkdir(parents=True, exist_ok=True)
    xs = panels(sheet, COLUMNS, 0)
    ys = panels(sheet, ROWS, 1)
    for index, name in enumerate(NAMES):
        (left, right), (top, bottom) = xs[index % COLUMNS], ys[index // COLUMNS]
        dx, dy = round((right - left) * TRIM), round((bottom - top) * TRIM)
        panel = sheet.crop((left + dx, top + dy, right - dx, bottom - dy))
        height = round(panel.height * WIDTH / panel.width)
        panel.resize((WIDTH, height), Image.LANCZOS).save(
            out / f"{name}.webp", "WEBP", quality=QUALITY, method=6
        )
        print(f"{name}: {panel.width}×{panel.height}")


if __name__ == "__main__":
    main()
