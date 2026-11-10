"""Cut 第一冊's lesson pictures out of the watercolor sheet painted with ChatGPT.

assets/artwork/book1/sheet.png is 4 × 2 on white, in the order the prompt asked for, row by row:
國字真簡單 (animals counting one to ten), 拍拍手, 這是誰的, 秋千, 大個子小個子, 比一比, 小路, and
an open 小書包 for the book's cover. Each picture is cut along its paint (the page is the white
reachable from the edges, so white inside a picture stays), cropped with a small margin on a
transparent page, and saved as assets/artwork/book1/<name>.png (the editable original) and
public/course-art/book1-<name>.webp (what the app loads). Then run npm run assets:thumbs.

    python3 scripts/slice-book1.py
"""

import importlib.util
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
# The English word slicer finds the page the same way.
spec = importlib.util.spec_from_file_location("slice_words", ROOT / "scripts" / "slice-words.py")
slicer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(slicer)

NAMES = ["numbers", "clap", "whose", "swing", "frogs", "door", "path", "cover"]
# Lesson pages show a picture at up to about 360 CSS px; twice that for sharp screens.
LONGEST = 720
QUALITY = 88


def pictures(mask: Image.Image, columns: int, rows: int) -> list[Image.Image]:
    """Each cell's picture: the patches of paint whose middle falls in that cell.

    This sheet's pictures sit only a few pixels apart, so unlike the word sheets, paint is not
    joined across small gaps first; a stray speck goes with the cell its middle is in.
    """
    scale = 2
    small = mask.resize((mask.width // scale, mask.height // scale))
    width, height = small.size
    pixels = small.load()
    seen = bytearray(width * height)
    cells: list[list[tuple[int, int]]] = [[] for _ in range(columns * rows)]
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
        cx = sum(x for x, _ in patch) / len(patch)
        cy = sum(y for _, y in patch) / len(patch)
        cell = min(rows - 1, int(cy * rows / height)) * columns + min(columns - 1, int(cx * columns / width))
        cells[cell].extend(patch)
    masks = []
    for points in cells:
        picture = Image.new("L", (width, height), 0)
        dots = picture.load()
        for x, y in points:
            dots[x, y] = 255
        # Back to full size, a pixel wider so the cut keeps the soft edge.
        masks.append(picture.resize(mask.size, Image.NEAREST).filter(ImageFilter.MaxFilter(3)))
    return masks


def main() -> None:
    folder = ROOT / "assets" / "artwork" / "book1"
    out = ROOT / "public" / "course-art"
    sheet = Image.open(folder / "sheet.png").convert("RGBA")
    mask = slicer.paint_mask(sheet)
    alpha = mask.filter(ImageFilter.GaussianBlur(0.8))
    cut = sheet.copy()
    cut.putalpha(ImageChops.multiply(alpha, sheet.getchannel("A")))
    for name, area in zip(NAMES, pictures(mask, 4, 2)):
        only = cut.copy()
        only.putalpha(ImageChops.multiply(cut.getchannel("A"), area))
        painted = ImageChops.multiply(mask, area).getbbox()
        if not painted:
            raise SystemExit(f"nothing painted for {name}")
        piece = only.crop(painted)
        margin = int(max(piece.size) * 0.03)
        page = Image.new("RGBA", (piece.width + 2 * margin, piece.height + 2 * margin), (0, 0, 0, 0))
        page.paste(piece, (margin, margin))
        page.save(folder / f"{name}.png")
        scale = min(1, LONGEST / max(page.size))
        page.resize((round(page.width * scale), round(page.height * scale)), Image.LANCZOS).save(
            out / f"book1-{name}.webp", "WEBP", quality=QUALITY, method=6
        )
        print(f"{name}: {piece.width}×{piece.height}")


if __name__ == "__main__":
    main()
