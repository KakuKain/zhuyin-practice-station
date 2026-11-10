import assert from "node:assert/strict";
import test from "node:test";
import {
  basicStrokes,
  buildStrokeRound,
  strokeClips,
  strokePages,
  strokeReading,
} from "../../features/hanzi/basic-strokes";
import { isHan } from "../../features/lesson/reading-variants";
import strokes from "../../features/hanzi/strokes.json";
import examples from "../../features/hanzi/stroke-examples.json";

const glyphs = { ...strokes, ...examples } as Record<string, { strokes: string[] }>;

test("認識國字基本筆畫 has the book's 28 strokes: 6, 8, 6 and 8 on pages 8 to 11", () => {
  assert.equal(basicStrokes.length, 28);
  assert.equal(new Set(basicStrokes.map((stroke) => stroke.name)).size, 28);
  assert.deepEqual(
    strokePages.map((page) => basicStrokes.filter((stroke) => stroke.page === page).length),
    [6, 8, 6, 8],
  );
});

test("each stroke is found in a character that has stroke data, by strokes it has", () => {
  for (const { name, find } of basicStrokes) {
    const glyph = glyphs[find.character];
    assert.ok(glyph, `${name}: no stroke data for ${find.character}`);
    assert.ok(find.strokes.length > 0, name);
    for (const index of find.strokes)
      assert.ok(index >= 0 && index < glyph.strokes.length, `${name}: ${find.character} ${index}`);
  }
  // The six strokes no 第一冊 生字 has are the only examples outside strokes.json.
  assert.deepEqual(Object.keys(examples).sort(), [..."乃互公吳弟風"].sort());
});

test("every stroke name and instruction has one reading per character and a clip to record", () => {
  for (const { text, readings } of strokeClips) {
    const syllables = readings.split(" ");
    assert.ok(!syllables.includes("undefined"), text);
    assert.equal(syllables.length, [...text].filter(isHan).length, text);
  }
  assert.equal(strokeReading("橫折鉤"), "ㄏㄥˊ ㄓㄜˊ ㄍㄡ");
  assert.equal(strokeClips.length, 28 + 3);
});

test("a page's round traces every stroke, then asks three by name and three in a character", () => {
  for (const page of strokePages) {
    const names = basicStrokes.filter((stroke) => stroke.page === page).map((s) => s.name);
    for (let seed = 1; seed <= 20; seed++) {
      let state = seed;
      const random = () => ((state = (state * 16807) % 2147483647) - 1) / 2147483646;
      const round = buildStrokeRound(page, random);
      const traces = round.filter((q) => q.kind === "trace").map((q) => q.stroke);
      assert.deepEqual(traces, names, "描一描 in the book's order");
      const picks = round.filter((q) => q.kind === "pick");
      const finds = round.filter((q) => q.kind === "find");
      assert.equal(picks.length, 3);
      assert.equal(finds.length, 3);
      for (const pick of picks) {
        assert.equal(pick.choices.length, 4);
        assert.equal(new Set(pick.choices).size, 4);
        assert.ok(pick.choices.includes(pick.stroke));
        assert.ok(pick.choices.every((choice) => names.includes(choice)));
      }
      // Six strokes on every page, so the finds never repeat a pick.
      const asked = [...picks, ...finds].map((q) => q.stroke);
      assert.equal(new Set(asked).size, 6);
    }
  }
});
