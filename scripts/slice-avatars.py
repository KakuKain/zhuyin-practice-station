"""Cut the children's avatars out of one sheet of 12 watercolor animals (4 across, 3 down).

The sheet was painted with ChatGPT and is kept as assets/artwork/avatars/sheet.png. Each animal
sits on a pastel circle on a white or transparent page. The circle is found in its cell, cropped
square, everything outside it made transparent, and saved as assets/artwork/avatars/<name>.png
(the editable original) and public/course-art/avatar-<name>.webp (what the app loads). The
subfolder keeps these out of scripts/optimize-artwork.mjs, which converts losslessly at full size.

    python3 scripts/slice-avatars.py assets/artwork/avatars/sheet.png
"""

from pathlib import Path
import sys

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
# The order the sheet was drawn in, row by row; the keys of childAvatars.
NAMES = [
    "cat", "dog", "rabbit", "bear",
    "panda", "fox", "frog", "tiger",
    "monkey", "penguin", "chick", "koala",
]
COLUMNS, ROWS = 4, 3
SIZE = 192  # Avatars show at up to 96 CSS px; twice that for sharp screens.


def gutters(ink: Image.Image, count: int, axis: int) -> list[int]:
    """Where the white gaps between circles are, across (axis 0) or down (axis 1) the sheet.

    Near each even split, the line crossing the fewest painted pixels is the gap; circles do not
    always sit exactly on the splits, and a white face (the panda) is not a gap.
    """
    width, height = ink.size
    length = width if axis == 0 else height
    pixels = ink.load()
    painted = [
        sum(1 for other in range(height if axis == 0 else width)
            if pixels[(at, other) if axis == 0 else (other, at)])
        for at in range(length)
    ]
    window = length // (count * 4)
    cuts = [0]
    for split in range(1, count):
        guess = round(split * length / count)
        cuts.append(min(range(guess - window, guess + window), key=lambda at: painted[at]))
    return cuts + [length]


def circle_box(ink: Image.Image, cell_box: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    """The square around the pastel circle in a cell between gutters."""
    box = ink.crop(cell_box).getbbox()
    if box is None:
        raise SystemExit("A cell has no circle in it; is this the 4 × 3 sheet?")
    left, top = cell_box[0], cell_box[1]
    side = max(box[2] - box[0], box[3] - box[1])
    cx, cy = left + (box[0] + box[2]) / 2, top + (box[1] + box[3]) / 2
    return (round(cx - side / 2), round(cy - side / 2), round(cx + side / 2), round(cy + side / 2))


def round_mask(side: int) -> Image.Image:
    """An anti-aliased circle, drawn large and scaled down."""
    big = Image.new("L", (side * 4, side * 4), 0)
    ImageDraw.Draw(big).ellipse((4, 4, side * 4 - 5, side * 4 - 5), fill=255)
    return big.resize((side, side), Image.LANCZOS)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    sheet = Image.open(sys.argv[1]).convert("RGBA")
    # Painted: anything that is not the page, which is transparent or white.
    alpha = sheet.getchannel("A").point(lambda value: 255 if value > 24 else 0)
    light = sheet.convert("L").point(lambda value: 255 if value < 244 else 0)
    ink = ImageChops.multiply(alpha, light) if alpha.getextrema()[0] == 0 else light
    xs, ys = gutters(ink, COLUMNS, 0), gutters(ink, ROWS, 1)
    for index, name in enumerate(NAMES):
        column, row = index % COLUMNS, index // COLUMNS
        cell_box = (xs[column], ys[row], xs[column + 1], ys[row + 1])
        avatar = sheet.crop(circle_box(ink, cell_box)).resize((SIZE, SIZE), Image.LANCZOS)
        alpha = ImageChops.multiply(avatar.getchannel("A"), round_mask(SIZE))
        avatar.putalpha(alpha)
        avatar.save(ROOT / "assets" / "artwork" / "avatars" / f"{name}.png")
        # Watercolor at this size is indistinguishable at quality 88, and a tenth of lossless.
        avatar.save(ROOT / "public" / "course-art" / f"avatar-{name}.webp", quality=88, method=6)
    print(f"Cut {len(NAMES)} avatars from {sys.argv[1]}.")


if __name__ == "__main__":
    main()
