// Builds features/hanzi/strokes.json, the stroke order of every 第一冊 生字, from the Make Me a
// Hanzi outlines in assets/strokes/source/ (hanzi-writer-data 2.0.1, Arphic Public License).
// That data follows the PRC stroke order; the corrections below bring each character to the
// order the textbook (康軒 一上 第一冊, 我會寫字) numbers, checked stroke by stroke against it.
//
//   npx tsx scripts/build-strokes.ts
//
// Source files are named by code point (62CD.json for 拍). A new character's file comes from
// https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/<character>.json.
import { readFileSync, writeFileSync } from "node:fs";
import { book1Lessons } from "../features/hanzi/book1-characters";

type Point = [number, number];
type Source = { strokes: string[]; medians: Point[][]; radStrokes?: number[] };
type Stroke = { path: string; median: Point[]; radical?: boolean };

const sourceDir = "assets/strokes/source";
const read = (character: string): Source =>
  JSON.parse(
    readFileSync(
      `${sourceDir}/${character.codePointAt(0)!.toString(16).toUpperCase()}.json`,
      "utf8",
    ),
  );

/** The outline as a polygon: lines kept, quadratic curves flattened into eight segments. */
function polygon(path: string): Point[] {
  const tokens = path.match(/[MLQCZ]|-?\d+(?:\.\d+)?/g) ?? [];
  const points: Point[] = [];
  let at: Point = [0, 0];
  for (let i = 0; i < tokens.length;) {
    const command = tokens[i++];
    const num = () => Number(tokens[i++]);
    if (command === "M" || command === "L") {
      at = [num(), num()];
      points.push(at);
    } else if (command === "Q") {
      const control: Point = [num(), num()];
      const end: Point = [num(), num()];
      for (let k = 1; k <= 8; k++) {
        const t = k / 8;
        points.push([
          (1 - t) ** 2 * at[0] + 2 * (1 - t) * t * control[0] + t ** 2 * end[0],
          (1 - t) ** 2 * at[1] + 2 * (1 - t) * t * control[1] + t ** 2 * end[1],
        ]);
      }
      at = end;
    } else if (command === "C") {
      const c1: Point = [num(), num()];
      const c2: Point = [num(), num()];
      const end: Point = [num(), num()];
      for (let k = 1; k <= 8; k++) {
        const t = k / 8;
        const u = 1 - t;
        points.push([
          u ** 3 * at[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t ** 3 * end[0],
          u ** 3 * at[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t ** 3 * end[1],
        ]);
      }
      at = end;
    }
  }
  return points;
}

const pathOf = (points: Point[]) =>
  `M ${points.map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`).join(" L ")} Z`;

/** Keeps the part of a polygon on one side of the horizontal line y = cut (Sutherland–Hodgman). */
function clip(points: Point[], cut: number, above: boolean): Point[] {
  const inside = ([, y]: Point) => (above ? y >= cut : y <= cut);
  const out: Point[] = [];
  points.forEach((current, i) => {
    const previous = points[(i + points.length - 1) % points.length];
    const crossing = (): Point => {
      const t = (cut - previous[1]) / (current[1] - previous[1]);
      return [previous[0] + t * (current[0] - previous[0]), cut];
    };
    if (inside(current)) {
      if (!inside(previous)) out.push(crossing());
      out.push(current);
    } else if (inside(previous)) out.push(crossing());
  });
  return out;
}

/** Cuts a median where it first crosses y = cut, the end point shared by both halves. */
function splitMedian(median: Point[], cut: number): [Point[], Point[]] {
  for (let i = 1; i < median.length; i++) {
    const [a, b] = [median[i - 1], median[i]];
    if ((a[1] - cut) * (b[1] - cut) <= 0 && a[1] !== b[1]) {
      const t = (cut - a[1]) / (b[1] - a[1]);
      const at: Point = [Math.round(a[0] + t * (b[0] - a[0])), cut];
      return [
        [...median.slice(0, i), at],
        [at, ...median.slice(i)],
      ];
    }
  }
  throw new Error(`the median never crosses y = ${cut}`);
}

/** Splits stroke `index` (from 1) at the horizontal line y = cut, the upper part first. */
function splitAt(strokes: Stroke[], index: number, cut: number): Stroke[] {
  const stroke = strokes[index - 1];
  const outline = polygon(stroke.path);
  const [first, second] = splitMedian(stroke.median, cut);
  const firstAbove = stroke.median[0][1] > cut;
  const pieces: Stroke[] = [
    { ...stroke, path: pathOf(clip(outline, cut, firstAbove)), median: first },
    { ...stroke, path: pathOf(clip(outline, cut, !firstAbove)), median: second },
  ];
  return [...strokes.slice(0, index - 1), ...pieces, ...strokes.slice(index)];
}

/** Splits stroke `index` at the vertical line x = cut, the left part first. */
function splitVertically(strokes: Stroke[], index: number, cut: number): Stroke[] {
  // Mirroring x and y lets the horizontal clip do the work.
  const swap = (points: Point[]) => points.map(([x, y]) => [y, x] as Point);
  const stroke = strokes[index - 1];
  const swapped = {
    ...stroke,
    path: pathOf(swap(polygon(stroke.path))),
    median: swap(stroke.median),
  };
  const [left, right] = splitAt([swapped], 1, cut).map((piece) => ({
    ...piece,
    path: pathOf(swap(polygon(piece.path))),
    median: swap(piece.median),
  }));
  // splitAt puts the median's first half first; the median runs left to right.
  return [...strokes.slice(0, index - 1), left, right, ...strokes.slice(index)];
}

const reorder = (strokes: Stroke[], order: number[]) => {
  if ([...order].sort((a, b) => a - b).join() !== strokes.map((_, i) => i + 1).join())
    throw new Error(`order ${order} does not use every stroke once`);
  return order.map((n) => strokes[n - 1]);
};

/** The box around some strokes' outlines. */
function box(strokes: Stroke[]) {
  const points = strokes.flatMap((stroke) => polygon(stroke.path));
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/** Strokes `from` of another character, stretched into the box of strokes `into` here. */
function borrow(strokes: Stroke[], into: number[], character: string, from: number[]): Stroke[] {
  const source = load(character);
  const taken = from.map((n) => source[n - 1]);
  const a = box(taken);
  const b = box(into.map((n) => strokes[n - 1]));
  const map = ([x, y]: Point): Point => [
    Math.round(b.x0 + ((x - a.x0) * (b.x1 - b.x0)) / (a.x1 - a.x0)),
    Math.round(b.y0 + ((y - a.y0) * (b.y1 - b.y0)) / (a.y1 - a.y0)),
  ];
  const moved = taken.map((stroke) => ({
    path: pathOf(polygon(stroke.path).map(map)),
    median: stroke.median.map(map),
    radical: strokes[into[0] - 1].radical,
  }));
  const result = [...strokes];
  result.splice(into[0] - 1, into.length, ...moved);
  return result;
}

/** Moves stroke `index` by (dx, dy). */
function shift(strokes: Stroke[], index: number, dx: number, dy: number, from = index): Stroke[] {
  const stroke = strokes[from - 1];
  const move = ([x, y]: Point): Point => [x + dx, y + dy];
  const result = [...strokes];
  result[index - 1] = {
    ...strokes[index - 1],
    path: pathOf(polygon(stroke.path).map(move)),
    median: stroke.median.map(move),
  };
  return result;
}

function load(character: string): Stroke[] {
  const source = read(character);
  return source.strokes.map((path, i) => ({
    path,
    median: source.medians[i],
    ...(source.radStrokes?.includes(i) ? { radical: true } : {}),
  }));
}

// Strokes are numbered from 1 as in the source; y grows upwards (the source's 1024 box, with the
// baseline at y = 900 from the top).
const corrections: Record<string, (strokes: Stroke[]) => Stroke[]> = {
  // 長 starts with the long 豎 on the left, then its four 橫.
  長: (s) => reorder(s, [2, 1, 3, 4, 5, 6, 7, 8]),
  // 每 in 海: both 點, then the long 橫.
  海: (s) => reorder(s, [1, 2, 3, 4, 5, 6, 7, 8, 10, 9]),
  // 里 in 裡: the 橫 under 日, then the 豎 through it, then the bottom 橫.
  裡: (s) => reorder(s, [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 10, 12]),
  // 戈 in 我 and 找: the 點 at the top right before the 撇.
  我: (s) => reorder(s, [1, 2, 3, 4, 5, 7, 6]),
  找: (s) => reorder(s, [1, 2, 3, 4, 5, 7, 6]),
  // 辶 is four strokes: 點, 橫折, 豎曲 and 捺; the source draws the middle two as one.
  這: (s) => splitAt(s, 9, 900 - 529),
  // 阝 is three strokes: the upper ear, the lower ear, then the 豎.
  啊: (s) => splitAt(s, 4, 900 - 301),
  陪: (s) => splitAt(s, 1, 900 - 322),
  那: (s) => splitAt(s, 5, 900 - 343),
  // 艹 is four strokes: 豎, 橫, 橫, 豎. The source's long 橫 is cut in two.
  花: (s) => reorder(splitVertically(s, 1, 512), [3, 1, 2, 4, 5, 6, 7, 8]),
  // 兌 in 說 has 八 on top, 撇 then 點, where the source has 丷: 六's last two strokes moved there.
  說: (s) => borrow(s, [8, 9], "六", [3, 4]),
  // The right half of 比 starts with a short 橫 like the left one, not a 撇.
  比: (s) => shift(s, 3, 300, 40, 1),
  // 起 ends in 巳, closed at the top, where the source has 己.
  起: (s) => borrow(s, [8, 9, 10], "巳", [1, 2, 3]),
};

const characters = book1Lessons.flatMap((lesson) => [...lesson.characters]);
const out: Record<string, { strokes: string[]; medians: Point[][]; radStrokes: number[] }> = {};
for (const character of characters) {
  const fix = corrections[character];
  const strokes = fix ? fix(load(character)) : load(character);
  out[character] = {
    strokes: strokes.map((stroke) => stroke.path),
    medians: strokes.map((stroke) => stroke.median),
    radStrokes: strokes.flatMap((stroke, i) => (stroke.radical ? [i] : [])),
  };
}
writeFileSync("features/hanzi/strokes.json", JSON.stringify(out) + "\n");
console.log(`Wrote ${characters.length} characters, ${Object.keys(corrections).length} corrected.`);
