import assert from "node:assert/strict";
import test from "node:test";
import { book1Facts, book1Lessons } from "../../features/hanzi/book1-characters";
import strokes from "../../features/hanzi/strokes.json";
import { judgeStroke, screenMedian, type Point } from "../../features/hanzi/stroke-match";

const data = strokes as Record<string, { strokes: string[]; medians: number[][][] }>;

test("every 第一冊 生字 has stroke data with the textbook's stroke count", () => {
  const characters = book1Lessons.flatMap((lesson) => [...lesson.characters]);
  assert.equal(characters.length, 84);
  assert.equal(new Set(characters).size, 84);
  for (const character of characters) {
    const entry = data[character];
    assert.ok(entry, `${character} has no stroke data`);
    assert.equal(entry.strokes.length, entry.medians.length, character);
    assert.equal(entry.strokes.length, book1Facts[character]?.strokes, `${character}'s strokes`);
  }
});

test("each stroke's median is a path of at least two points inside the 1024 box", () => {
  for (const [character, entry] of Object.entries(data))
    entry.medians.forEach((median, i) => {
      assert.ok(median.length >= 2, `${character} stroke ${i + 1}`);
      for (const [x, y] of median)
        assert.ok(x >= 0 && x <= 1024 && y >= -124 && y <= 900, `${character} stroke ${i + 1}`);
    });
});

/** A child's stroke: the median, moved a little and wavering, sampled densely. */
function written(median: Point[], dx: number, dy: number, wave: number): Point[] {
  return median.flatMap((p, i) =>
    i === 0
      ? [{ x: p.x + dx, y: p.y + dy }]
      : Array.from({ length: 6 }, (_, k) => {
          const a = median[i - 1];
          const t = (k + 1) / 6;
          const w = Math.sin(i * 6 + k) * wave;
          return { x: a.x + t * (p.x - a.x) + dx + w, y: a.y + t * (p.y - a.y) + dy - w };
        }),
  );
}

test("a stroke written near its median matches; the next stroke written first is out of order", () => {
  for (const [character, entry] of Object.entries(data)) {
    const medians = entry.medians.map(screenMedian);
    medians.forEach((median, k) => {
      for (const [dx, dy] of [
        [0, 0],
        [30, -25],
        [-35, 20],
      ])
        assert.equal(
          judgeStroke(written(median, dx, dy, 12), medians, k),
          "match",
          `${character} stroke ${k + 1}`,
        );
      if (k + 1 < medians.length)
        assert.equal(
          judgeStroke(written(medians[k + 1], 10, 10, 8), medians, k),
          "wrong-order",
          `${character} stroke ${k + 2} before ${k + 1}`,
        );
    });
  }
});

test("a long stroke written backwards, or somewhere else, does not match", () => {
  const medians = data["十"].medians.map(screenMedian);
  assert.equal(judgeStroke([...medians[0]].reverse(), medians, 0), "miss");
  const elsewhere = medians[0].map((p) => ({ x: p.x, y: p.y + 380 }));
  assert.equal(judgeStroke(elsewhere, medians, 0), "miss");
});
