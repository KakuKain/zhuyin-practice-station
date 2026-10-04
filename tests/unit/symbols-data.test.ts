import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { combinedRhymeExamples } from "../../features/symbols/combined-rhyme-audio";
import { listeningAudioUrl } from "../../features/listening/listening-data";
import { combinedRhymeGroups } from "../../features/symbols/symbols-data";
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

test("all 22 combined rhymes have a unique playable local clip", () => {
  const rhymes = combinedRhymeGroups.flatMap((group) => [...group.cells]);
  assert.equal(rhymes.length, 22);
  assert.equal(new Set(rhymes).size, 22);
  assert.deepEqual(
    combinedRhymeGroups.map((group) => group.cells.length),
    [10, 8, 4],
  );
  for (const rhyme of rhymes) {
    assert.equal(rhyme.length, 2);
    assert.ok(
      existsSync(new URL(`../../public${listeningAudioUrl(rhyme)}`, import.meta.url)),
      rhyme,
    );
  }
});

test("combined-rhyme playback uses intact official example recordings with explicit tones", () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL("../../public/listening-audio/moe-examples/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(manifest.dictionaryVersion, "2014_20260929");
  assert.equal(combinedRhymeExamples.length, 22);
  assert.equal(manifest.clips.length, 22);
  for (const example of combinedRhymeExamples) {
    assert.equal(listeningAudioUrl(example.rhyme), example.audioUrl);
    assert.equal(example.zhuyin, example.rhyme + (example.rhyme === "ㄧㄞ" ? "ˊ" : ""));
    assert.equal(example.tone, example.rhyme === "ㄧㄞ" ? "第二聲" : "第一聲");
    assert.ok(example.sourceUrl.startsWith("https://dict.concised.moe.edu.tw/sound/word/"));
    const clip = manifest.clips.find((item: { rhyme: string }) => item.rhyme === example.rhyme);
    assert.ok(clip);
    assert.equal(clip.record, example.record);
    const bytes = readFileSync(new URL(`../../public${example.audioUrl}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), clip.sha256);
    assert.equal(bytes.length, clip.bytes);
  }
  assert.ok(
    existsSync(new URL("../../public/listening-audio/moe-examples/使用說明.pdf", import.meta.url)),
  );
});
