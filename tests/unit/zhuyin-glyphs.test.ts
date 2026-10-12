import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { syllableGlyphs } from "../../features/lesson/zhuyin-glyphs";

// Written by scripts/build-yo-fonts.py from the shipped KidLessonYoOnly subset.
const shown: Record<string, string> = JSON.parse(
  readFileSync("assets/font-sources/KidLessonYoOnly-readings.json", "utf8"),
);

test("every answer glyph is in the font subset and shows its own reading", () => {
  for (const [syllable, glyph] of Object.entries(syllableGlyphs)) {
    // 弟 switches to its neutral-tone annotation with the font's ss01 feature (is-neutral-di).
    if (syllable === "˙ㄉㄧ") continue;
    assert.ok(
      glyph in shown,
      `${syllable} → ${glyph} is missing from KidLessonYoOnly; run python3 scripts/build-yo-fonts.py`,
    );
    assert.equal(
      shown[glyph],
      syllable,
      `${syllable} → ${glyph} shows ${shown[glyph]}; pick its variation selector in zhuyin-glyphs.ts`,
    );
  }
});
