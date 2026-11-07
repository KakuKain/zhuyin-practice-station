/**
 * Judges one written stroke against a character's strokes, in the 1024 box of strokes.json with
 * y pointing down (the data's y grows upwards from a baseline at 900).
 *
 * A stroke matches when it starts and ends near the expected stroke's ends, stays close to its
 * median along the way, runs the same way and has a similar shape and length. When a stroke
 * fits a later stroke much better than the expected one, it was written out of order.
 */
export type Point = { x: number; y: number };
export type StrokeVerdict = "match" | "wrong-order" | "miss";

/** A median from strokes.json, turned so y points down. */
export const screenMedian = (median: readonly (readonly number[])[]): Point[] =>
  median.map(([x, y]) => ({ x, y: 900 - y }));

/** A point of the 0–100 writing square, in the 1024 box. */
export const fromSquare = ({ x, y }: Point): Point => ({ x: x * 10.24, y: y * 10.24 });

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const pathLength = (points: Point[]) =>
  points.reduce((sum, point, i) => (i ? sum + distance(points[i - 1], point) : 0), 0);

/** `count` points spread evenly along the path. */
function resample(points: Point[], count: number): Point[] {
  const total = pathLength(points);
  if (points.length < 2 || total === 0) return Array.from({ length: count }, () => points[0]);
  const out: Point[] = [points[0]];
  const step = total / (count - 1);
  let travelled = 0;
  let next = step;
  for (let i = 1; i < points.length && out.length < count - 1; i++) {
    const segment = distance(points[i - 1], points[i]);
    while (travelled + segment >= next && out.length < count - 1) {
      const t = (next - travelled) / segment;
      out.push({
        x: points[i - 1].x + t * (points[i].x - points[i - 1].x),
        y: points[i - 1].y + t * (points[i].y - points[i - 1].y),
      });
      next += step;
    }
    travelled += segment;
  }
  out.push(points.at(-1)!);
  return out;
}

function toSegment(p: Point, a: Point, b: Point) {
  const length2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  const t = length2
    ? Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / length2))
    : 0;
  return distance(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}
const toPath = (p: Point, path: Point[]) =>
  path.length < 2
    ? distance(p, path[0])
    : Math.min(...path.slice(1).map((b, i) => toSegment(p, path[i], b)));

/** Discrete Fréchet distance between two paths of the same number of points. */
function frechet(a: Point[], b: Point[]) {
  const n = a.length;
  const memo: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const d = distance(a[i], b[j]);
      memo[i][j] =
        i === 0 && j === 0
          ? d
          : i === 0
            ? Math.max(memo[0][j - 1], d)
            : j === 0
              ? Math.max(memo[i - 1][0], d)
              : Math.max(Math.min(memo[i - 1][j], memo[i - 1][j - 1], memo[i][j - 1]), d);
    }
  return memo[n - 1][n - 1];
}

/** Both paths moved to start at the origin and scaled by the expected stroke's length. */
const normalized = (points: Point[], scale: number) =>
  points.map((p) => ({ x: (p.x - points[0].x) / scale, y: (p.y - points[0].y) / scale }));

/**
 * How far the written stroke is from a stroke, or Infinity when it does not fit it at all.
 * `leniency` above 1 forgives more; a child writing without the model gets a little more room.
 */
export function strokeDistance(written: Point[], median: Point[], leniency = 1): number {
  if (written.length === 0) return Infinity;
  const expectedLength = Math.max(pathLength(median), 1);
  const writtenLength = pathLength(written);
  const start = distance(written[0], median[0]);
  const end = distance(written.at(-1)!, median.at(-1)!);
  const ends = 230 * leniency;
  if (start > ends || end > ends) return Infinity;
  const samples = resample(written.length > 1 ? written : [written[0], written[0]], 16);
  const along = samples.reduce((sum, p) => sum + toPath(p, median), 0) / samples.length;
  if (along > 140 * leniency) return Infinity;
  // A short stroke (a 點) only needs to be in the right place.
  if (expectedLength > 90) {
    // A wavering hand lengthens a short stroke most, so its upper bound counts from 200.
    if (writtenLength < (0.35 * expectedLength) / leniency) return Infinity;
    if (writtenLength > 2.6 * leniency * Math.max(expectedLength, 200)) return Infinity;
    const dx = written.at(-1)!.x - written[0].x;
    const dy = written.at(-1)!.y - written[0].y;
    const ex = median.at(-1)!.x - median[0].x;
    const ey = median.at(-1)!.y - median[0].y;
    if (dx * ex + dy * ey <= 0) return Infinity;
    // Short strokes are measured against a longer one, so a small wobble is not a new shape.
    const scale = Math.max(expectedLength, 240);
    const shape = frechet(normalized(samples, scale), normalized(resample(median, 16), scale));
    if (shape > 0.55 * leniency) return Infinity;
  }
  return along + (start + end) / 2;
}

/**
 * The verdict on a stroke written when `expected` (from 0) is next. Strokes before it are done;
 * a stroke that fits a later one at least three times as well as the expected one is out of order.
 */
export function judgeStroke(
  written: Point[],
  medians: Point[][],
  expected: number,
  leniency = 1,
): StrokeVerdict {
  const own = strokeDistance(written, medians[expected], leniency);
  let other = Infinity;
  for (let i = expected + 1; i < medians.length; i++)
    other = Math.min(other, strokeDistance(written, medians[i], leniency));
  // Close parallel strokes (the 橫 of 日) fit each other too: only a stroke that clearly sits on
  // a later one, or fits nothing else, is out of order.
  if (other < Infinity && other * 3 < own) return "wrong-order";
  return own < Infinity ? "match" : "miss";
}
