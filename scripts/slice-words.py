"""Cut the English lessons' word pictures out of the watercolor sheets painted with ChatGPT.

Two sheets, in the order the prompts asked for, row by row:
  assets/artwork/words/sheet-1.png  4 × 3: ant apple bag banana / bear bed cake cat / duck egg elephant fan
  assets/artwork/words/sheet-2.png  4 × 2: fish goat hen insect / jet kite lion monkey

A sheet may come on white or on a transparent page. On white, the page is what can be reached from
the edges without crossing paint, so white inside a picture (an egg, a cat's chest) stays. Each
picture is cropped to its paint, centred on a square transparent canvas and saved as
assets/artwork/words/<word>.png (the editable original) and public/course-art/words/<word>.webp
(what the app loads). Then list the words in `paintedWords` (features/english/english-lessons.ts).

    python3 scripts/slice-words.py
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SHEETS = [
    ("sheet-1.png", 4, 3, ["ant", "apple", "bag", "banana", "bear", "bed", "cake", "cat",
                           "duck", "egg", "elephant", "fan"]),
    ("sheet-2.png", 4, 2, ["fish", "goat", "hen", "insect", "jet", "kite", "lion", "monkey"]),
]
# Pictures show at up to about 240 CSS px; twice that for sharp screens.
SIZE = 480
QUALITY = 88
# How far from white a pixel must be to count as paint, out of 255.
PAPER = 22


def paint_mask(sheet: Image.Image) -> Image.Image:
    """255 where there is paint, 0 for the page."""
    if sheet.mode == "RGBA" and sheet.getchannel("A").getextrema()[0] < 250:
        return sheet.getchannel("A").point(lambda value: 255 if value > 16 else 0)
    # Distance from white: how far the furthest channel is from 255.
    red, green, blue = (channel.point(lambda v: 255 - v) for channel in sheet.convert("RGB").split())
    ink = ImageChops.lighter(ImageChops.lighter(red, green), blue)
    mask = ink.point(lambda value: 255 if value > PAPER else 0)
    # The page is the unpainted area reachable from the edges.
    width, height = mask.size
    edges = [(x, 0) for x in range(0, width, 4)] + [(x, height - 1) for x in range(0, width, 4)]
    edges += [(0, y) for y in range(0, height, 4)] + [(width - 1, y) for y in range(0, height, 4)]
    for point in edges:
        if mask.getpixel(point) == 0:
            ImageDraw.floodfill(mask, point, 128)
    return mask.point(lambda value: 0 if value == 128 else 255)


def pictures(mask: Image.Image, columns: int, rows: int) -> list[Image.Image]:
    """Each cell's picture as a mask: the patches of paint whose middle falls in that cell.

    Pictures reach past an even split (an elephant's tail, a kite's ribbon), so the sheet is not
    cut along lines. Paint a few pixels apart is one patch, so a ribbon stays with its kite.
    """
    scale = 4
    small = mask.resize((mask.width // scale, mask.height // scale)).filter(ImageFilter.MaxFilter(5))
    width, height = small.size
    pixels = small.load()
    seen = bytearray(width * height)
    cells: list[list[list[tuple[int, int]]]] = [[] for _ in range(columns * rows)]
    for start in range(width * height):
        if seen[start] or not pixels[start % width, start // width]:
            continue
        seen[start] = 1
        patch, queue = [], [start]
        while queue:
            at = queue.pop()
            x, y = at % width, at // width
            patch.append((x, y))
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                near = ny * width + nx
                if 0 <= nx < width and 0 <= ny < height and not seen[near] and pixels[nx, ny]:
                    seen[near] = 1
                    queue.append(near)
        if len(patch) < 30:
            continue  # A stray speck.
        cx = sum(x for x, _ in patch) / len(patch)
        cy = sum(y for _, y in patch) / len(patch)
        cell = min(rows - 1, int(cy * rows / height)) * columns + min(columns - 1, int(cx * columns / width))
        cells[cell].append(patch)
    masks = []
    for patches in cells:
        picture = Image.new("L", (width, height), 0)
        dots = picture.load()
        for patch in patches:
            for x, y in patch:
                dots[x, y] = 255
        masks.append(picture.resize(mask.size, Image.NEAREST))
    return masks


def main() -> None:
    folder = ROOT / "assets" / "artwork" / "words"
    out = ROOT / "public" / "course-art" / "words"
    out.mkdir(parents=True, exist_ok=True)
    for name, columns, rows, words in SHEETS:
        sheet = Image.open(folder / name).convert("RGBA")
        mask = paint_mask(sheet)
        # Soften the cut edge a little, so the picture does not look snipped out.
        alpha = mask.filter(ImageFilter.GaussianBlur(0.8))
        cut = sheet.copy()
        cut.putalpha(ImageChops.multiply(alpha, sheet.getchannel("A")))
        for word, area in zip(words, pictures(mask, columns, rows)):
            only = cut.copy()
            only.putalpha(ImageChops.multiply(cut.getchannel("A"), area))
            painted = ImageChops.multiply(mask, area).getbbox()
            if not painted:
                raise SystemExit(f"{name}: nothing painted for {word}")
            piece = only.crop(painted)
            side = int(max(piece.size) * 1.08)
            square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
            square.paste(piece, ((side - piece.width) // 2, (side - piece.height) // 2))
            square.save(folder / f"{word}.png")
            square.resize((SIZE, SIZE), Image.LANCZOS).save(
                out / f"{word}.webp", "WEBP", quality=QUALITY, method=6
            )
            print(f"{word}: {piece.width}×{piece.height}")


if __name__ == "__main__":
    main()
