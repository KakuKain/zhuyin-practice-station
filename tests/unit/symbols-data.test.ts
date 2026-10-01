import assert from "node:assert/strict";
import test from "node:test";
import { allSymbols, consonants, symbolGroups, vowels } from "../../features/symbols/symbols-data";
import { lessons } from "../../features/courses/course-data";
import {
  lessonTitleVariants,
  withPronunciationVariants,
} from "../../features/lesson/annotated-text";

test("the chart contains all 37 basic symbols exactly once, grouped into 21 and 16", () => {
  assert.equal(consonants.length, 21);
  assert.equal(vowels.length, 16);
  assert.equal(allSymbols.length, 37);
  assert.equal(new Set(allSymbols).size, 37);
  assert.deepEqual(
    [...allSymbols].sort(),
    Array.from({ length: 37 }, (_, i) => String.fromCodePoint(0x3105 + i)),
  );
  for (const [index, group] of symbolGroups.entries()) {
    const cells = group.cells.filter((cell) => cell !== null);
    assert.equal(group.cells.length % group.columns, 0);
    assert.equal(cells.length, group.count);
    assert.deepEqual([...cells].sort(), [...(index === 0 ? consonants : vowels)].sort());
  }
});

test("title annotations retain every character and use context-correct neutral tones", () => {
  assert.equal(withPronunciationVariants("鵝寶寶", lessonTitleVariants[1]), "鵝寶寶\u{E01E1}");
  assert.equal(withPronunciationVariants("謝謝老師", lessonTitleVariants[5]), "謝謝\u{E01E1}老師");
  assert.equal(withPronunciationVariants("拔蘿蔔", lessonTitleVariants[7]), "拔蘿蔔\u{E01E1}");
  lessons.forEach((lesson, index) => {
    assert.equal(
      withPronunciationVariants(lesson.title, lessonTitleVariants[index]).replace(
        /[\u{E0100}-\u{E01EF}]/gu,
        "",
      ),
      lesson.title,
    );
  });
});
