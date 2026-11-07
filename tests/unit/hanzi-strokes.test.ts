import assert from "node:assert/strict";
import test from "node:test";
import { book1Facts, book1Lessons } from "../../features/hanzi/book1-characters";
import strokes from "../../features/hanzi/strokes.json";

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
