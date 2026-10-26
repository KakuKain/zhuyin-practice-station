import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import {
  dialoguesTaught,
  englishCourse,
  englishDialogues,
  englishLessons,
  englishWord,
  englishWordReadings,
  englishWords,
  lettersTaught,
  paintedWords,
  writingTips,
} from "../../features/english/english-lessons";
import {
  buildTapRound,
  buildWriteRound,
  newWriteRound,
  roundLength,
  tapAnswer,
  tapClips,
  tapPromptId,
  tapRoundSize,
  validateWriteRound,
  writeAnswer,
  writeClips,
  writePromptId,
  type TapQuestion,
} from "../../features/english/english-round";
import {
  englishClipUrl,
  englishClips,
  englishPromptReadings,
  englishPromptVariants,
  englishPrompts,
  hasEnglishClip,
} from "../../features/english/english-audio";
import { letterShape, lowerShapes } from "../../features/english/letter-shapes";
import { isHan } from "../../features/lesson/reading-variants";
import {
  englishRoundStorageKey,
  isLessonRecordKey,
  ownsStorageKey,
  storageKeys,
} from "../../lib/storage/storage-keys";
import { childRecordKeys } from "../../lib/storage/child-profiles";
import { taskKeys } from "../../features/rewards/stamp-book";
import { taskDestination, taskOptions } from "../../features/rewards/daily-tasks";
import { buildCatalog, initialMaterials } from "../../features/courses/materials";

const tapRounds = englishLessons.flatMap((lesson) =>
  Array.from({ length: 150 }, () => ({ lesson, round: buildTapRound(lesson.id) })),
);
const writeRounds = englishLessons.flatMap((lesson) =>
  Array.from({ length: 150 }, () => ({ lesson, round: buildWriteRound(lesson.id) })),
);

test("the course follows the workbook, and each lesson teaches its own letters", () => {
  assert.deepEqual(
    englishCourse.map((lesson) => lesson.number),
    ["第一課", "第二課", "複習一", "第三課", "第四課", "複習二", "總複習"],
  );
  assert.deepEqual(
    englishLessons.map((lesson) => lesson.letters.join("")),
    ["abc", "def"],
  );
  assert.deepEqual(lettersTaught(2), [..."abcdef"]);
  for (const lesson of englishLessons) {
    // Each letter has its key word, as on the workbook's I Can Write page.
    for (const letter of lesson.letters)
      assert.ok(
        lesson.words.some((word) => word.startsWith(letter)),
        `${letter} needs a word`,
      );
    for (const word of lesson.words) assert.ok(englishWords[word], word);
    for (const id of lesson.dialogues) assert.ok(englishDialogues[id], id);
  }
  assert.equal(new Set(englishCourse.map((lesson) => lesson.id)).size, englishCourse.length);
});

test("every letter a lesson shows is drawn, in both cases, on the four lines", () => {
  const shown = new Set([
    ...englishCourse.flatMap((lesson) => lesson.letters.flatMap((l) => [l, l.toUpperCase()])),
    ...Object.keys(englishWords).flatMap((word) => [...word]),
  ]);
  for (const letter of shown) {
    const shape = letterShape(letter);
    assert.ok(shape, `${letter} has no shape`);
    assert.ok(shape.width > 0 && shape.strokes.length > 0, letter);
    for (const stroke of shape.strokes) assert.match(stroke, /^M-?[\d.]+ -?[\d.]+/, letter);
  }
  // Capital I has bars, so it never looks like small l.
  assert.equal(letterShape("I")!.strokes.length, 3);
  assert.equal(lowerShapes.l.strokes.length, 1);
  assert.equal(Object.keys(lowerShapes).length, 26);
});

test("a 認一認 round walks letters, capitals and small letters, words, then a dialogue", () => {
  for (const { lesson, round } of tapRounds) {
    assert.equal(round.length, roundLength(lesson.id, "tap"));
    const sections = round.map((question) =>
      question.kind === "hear-letter"
        ? 0
        : question.kind === "match-case" || question.kind === "find-all"
          ? 1
          : question.kind === "dialogue"
            ? 3
            : 2,
    );
    assert.deepEqual(
      sections,
      [...sections].sort((a, b) => a - b),
      "sections stay in order",
    );
    assert.equal(round.at(-1)!.kind, "dialogue");
    assert.equal(sections.filter((section) => section === 2).length, tapRoundSize.words);
  }
});

test("each 認一認 answer is the one tap a child should make, among taught letters", () => {
  for (const { lesson, round } of tapRounds) {
    const taught = lettersTaught(lesson.id);
    for (const question of round) {
      const answer = tapAnswer(question);
      assert.ok(answer.length > 0 && answer.every((index) => index >= 0), question.kind);
      assert.equal(new Set(answer).size, answer.length);
      const letters = lettersOf(question);
      for (const letter of letters) assert.ok(taught.includes(letter.toLowerCase()), letter);
      switch (question.kind) {
        case "hear-letter":
        case "match-case":
          // One right choice; the others are another case or another letter.
          assert.equal(new Set(question.choices).size, question.choices.length);
          assert.equal(question.choices.length, 3);
          break;
        case "find-all":
          assert.equal(question.grid.length, 8);
          assert.ok(answer.length >= 3 && answer.length < 8);
          break;
        case "hear-initial":
        case "see-initial":
          assert.equal(new Set(question.choices).size, question.choices.length);
          assert.ok(question.choices.includes(question.word[0]));
          break;
        case "hear-word":
          assert.notEqual(question.choices[0][0], question.choices[1][0]);
          break;
        case "word-order":
          assert.equal(new Set(question.words).size, 3);
          assert.deepEqual([...question.pictures].sort(), [...question.words].sort());
          break;
        case "dialogue": {
          assert.ok(lesson.dialogues.includes(question.dialogue));
          const [a, b] = question.choices.map((id) => englishDialogues[id]);
          assert.ok(!a.group || a.group !== b.group, "never two goodbyes");
          for (const id of question.choices) assert.ok(dialoguesTaught(lesson.id).includes(id));
          break;
        }
      }
    }
  }
});

const lettersOf = (question: TapQuestion) =>
  question.kind === "find-all"
    ? question.grid
    : question.kind === "hear-letter" || question.kind === "match-case"
      ? question.choices
      : question.kind === "hear-initial" || question.kind === "see-initial"
        ? question.choices
        : [];

test("a 寫一寫 round traces the lesson's letters, then letters heard, first letters and order", () => {
  for (const { lesson, round } of writeRounds) {
    assert.equal(round.length, roundLength(lesson.id, "write"));
    assert.deepEqual(
      round.slice(0, lesson.letters.length).map((question) => question.kind),
      lesson.letters.map(() => "trace"),
    );
    const letters = round.filter((question) => question.kind === "write-letter");
    assert.equal(letters.length, 4);
    assert.equal(letters.filter((question) => question.case === "upper").length, 2);
    const missing = round.filter((question) => question.kind === "write-missing");
    // 第一課 has only three letters, too few for a row.
    assert.equal(missing.length, lesson.id === 1 ? 0 : 1);
    for (const question of missing) {
      assert.equal(question.row.length, 5);
      assert.deepEqual(
        question.row,
        lettersTaught(lesson.id).slice(
          lettersTaught(lesson.id).indexOf(question.row[0]),
          lettersTaught(lesson.id).indexOf(question.row[0]) + 5,
        ),
      );
      assert.ok(question.blanks.length >= 2 && question.blanks.length < 5);
    }
    for (const question of round)
      for (const letter of writeAnswer(question)) assert.ok(letterShape(letter), letter);
  }
});

test("a saved 寫一寫 round survives a reload, and a damaged one is dropped", () => {
  const round = {
    ...newWriteRound(2, 100),
    index: 3,
    work: {
      0: [[[{ x: 10, y: 20 }]], []],
      1: [[[{ x: 10, y: 20 }]], [], []],
      99: [[[{ x: 1, y: 1 }]]],
    },
    needsPractice: [1, 42],
  };
  const restored = validateWriteRound(JSON.parse(JSON.stringify(round)))!;
  assert.equal(restored.index, 3);
  // The trace has two squares (capital, small); a list of the wrong length is dropped.
  assert.deepEqual(Object.keys(restored.work), ["0"]);
  assert.deepEqual(restored.needsPractice, [1]);
  assert.equal(
    validateWriteRound({ ...round, questions: [{ kind: "trace", letter: "AB" }] }),
    null,
  );
  assert.equal(validateWriteRound({ ...round, version: 2 }), null);
});

test("English records belong to each child and are included in device backup", () => {
  for (const key of [storageKeys.englishRecords, storageKeys.englishRecent]) {
    assert.ok(ownsStorageKey(key));
    assert.ok(ownsStorageKey(`${key}@k2`));
  }
  assert.equal(englishRoundStorageKey(1), "kid-english-round-v1-1");
  assert.ok(isLessonRecordKey("kid-english-round-v1-2@k2"));
  assert.ok(!ownsStorageKey("kid-english-round-v1-x"));
  const items = new Map([
    ["kid-english-round-v1-2@k2", "{}"],
    ["kid-english-records-v1@k2", "{}"],
    ["kid-english-round-v1-2", "{}"],
  ]);
  const storage = {
    get length() {
      return items.size;
    },
    key: (index: number) => [...items.keys()][index] ?? null,
  } as Storage;
  assert.deepEqual(childRecordKeys("k2", storage).sort(), [
    "kid-english-records-v1@k2",
    "kid-english-round-v1-2@k2",
  ]);
});

// Written by scripts/build-yo-fonts.py from the shipped KidLessonYoSans subset.
const annotated: Record<string, string> = JSON.parse(
  readFileSync("assets/font-sources/KidLessonYoSans-readings.json", "utf8"),
);

const checkAnnotated = (
  label: string,
  text: string,
  readings: string,
  variants: Record<number, string>,
) => {
  const syllables = readings.split(" ");
  const characters = Array.from(text);
  assert.equal(syllables.length, characters.filter(isHan).length, `${label}: one per character`);
  let syllable = 0;
  characters.forEach((character, index) => {
    if (!isHan(character)) return;
    const glyph = character + (variants[index] ?? "");
    assert.ok(glyph in annotated, `${label}: ${character} is missing from the font`);
    assert.equal(annotated[glyph], syllables[syllable++], `${label}: ${character}`);
  });
};

test("every Chinese word and instruction on the English screens shows the right zhuyin", () => {
  const shown = [
    "英語",
    "上學期",
    ...englishCourse.map((lesson) => lesson.number),
    ...["認一認", "寫一寫", "這一課", "開始", "繼續", "繼續練習", "從頭開始", "第", "題"],
    ...["字母", "大寫和小寫", "單字", "對話", "描一描", "聽寫字母", "字母順序", "大寫", "小寫"],
  ];
  for (const text of shown) {
    assert.ok(englishWordReadings[text], `${text} needs its readings`);
    checkAnnotated(text, text, englishWordReadings[text], englishWord(text).variants);
  }
  for (const [id, text] of Object.entries(englishPrompts))
    checkAnnotated(id, text, englishPromptReadings[id], englishPromptVariants(id));
  // 這個 and 第一個: the measure word is light in one, full in the other.
  assert.deepEqual(englishPromptVariants("to-lower"), { 3: "\u{E01E1}" });
});

test("every clip a question plays is listed, and voiced clips are shipped", () => {
  const used = new Set<string>();
  for (const { round } of tapRounds)
    for (const question of round) {
      used.add(`prompt-${tapPromptId(question)}`);
      for (const id of tapClips(question)) used.add(id);
    }
  for (const { round } of writeRounds)
    for (const question of round) {
      used.add(`prompt-${writePromptId(question)}`);
      for (const id of writeClips(question)) used.add(id);
    }
  for (const id of used) assert.ok(englishClips[id], id);
  for (const id of Object.keys(englishClips).filter(hasEnglishClip))
    assert.ok(existsSync(`public/${englishClipUrl(id).split("?")[0]}`), id);
});

test("every clip a lesson plays is voiced, on this Mac or by Gemini", () => {
  const missing = Object.keys(englishClips).filter(
    (id) =>
      !hasEnglishClip(id) &&
      (id.startsWith("prompt-") ||
        englishLessons.some(
          (lesson) =>
            lesson.letters.some((letter) => id === `letter-${letter}`) ||
            lesson.words.some((word) => id === `word-${word}`) ||
            lesson.dialogues.some((dialogue) => id === `dialogue-${dialogue}`),
        )),
  );
  assert.deepEqual(missing, []);
});

test("painted word pictures are shipped, and the writing tips name real letters", () => {
  for (const word of paintedWords) {
    assert.ok(englishWords[word], word);
    assert.ok(existsSync(`public/course-art/words/${word}.webp`), word);
  }
  for (const letter of Object.keys(writingTips)) assert.ok(letterShape(letter), letter);
});

test("each English lesson's 認一認 and 寫一寫 can be today's task, and 去做 opens it", () => {
  const options = taskOptions(buildCatalog(initialMaterials));
  for (const lesson of englishLessons)
    for (const mode of ["tap", "write"] as const)
      assert.ok(options.some((option) => option.key === taskKeys.english(lesson.id, mode)));
  assert.deepEqual(taskDestination(taskKeys.english(2, "write")), { kind: "english", lessonId: 2 });
});
