"""Cut 閱讀階梯「擁抱」's pictures out of its two watercolor sheets, painted with ChatGPT.

assets/artwork/reading/scenes.png is 3 × 2: the story's six scenes in order (alone, frog,
elephant, stuck, climb, hug). things.png is 4 × 2: frog, elephant, bear, girl, hedgehog, balloon,
bag, hat. Each picture goes to assets/artwork/reading/<name>.png and
public/course-art/reading/<name>.webp; then list the names in `paintedReading`
(features/hanzi/reading-lesson.ts).

    python3 scripts/slice-reading.py
"""

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("slice_book1", ROOT / "scripts" / "slice-book1.py")
book1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(book1)

folder = ROOT / "assets" / "artwork" / "reading"
out = ROOT / "public" / "course-art" / "reading"
out.mkdir(parents=True, exist_ok=True)
book1.cut_sheet(folder / "scenes.png", 3, 2, ["alone", "frog-runs", "elephant-hurt", "stuck", "climb", "hug"], folder, out)
book1.cut_sheet(folder / "things.png", 4, 2, ["frog", "elephant", "bear", "girl", "hedgehog", "balloon", "bag", "hat"], folder, out)
