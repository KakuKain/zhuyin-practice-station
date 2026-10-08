import test from "node:test";
import assert from "node:assert/strict";
import {
  appendImportedMaterials,
  buildCatalog,
  builtinCatalog,
  builtinLessons,
  builtinReviews,
  initialMaterials,
  parseMaterialFile,
  parseWordList,
  rowsToTerms,
  serializeMaterialFile,
  validateMaterials,
} from "../../features/courses/materials";
import { buildListeningSession, findQuestionSeed } from "../../features/listening/listening-data";
import {
  builtinLessonIndex,
  firstCustomLessonIndex,
  isCustomLessonIndex,
} from "../../features/courses/lesson-identity";
import {
  courseArtwork,
  exercises,
  lessonNumerals,
  lessons,
} from "../../features/courses/course-data";
import { circledVocabulary } from "../../features/courses/circled-vocabulary";
import {
  validatePracticeState,
  validatedFillFavorites,
} from "../../features/practice/practice-storage";

test("word import requires confirmed readings, deduplicates terms and normalizes neutral tone", () => {
  const rows = parseWordList("半、半\n飯 ㄈㄢˋ\n爸爸（ㄅㄚˋ ㄅㄚ˙）");
  assert.equal(rows.length, 3);
  assert.equal(rows[0].reading, "ㄅㄢˋ");
  assert.deepEqual(rowsToTerms(rows)[2].syllables, ["ㄅㄚˋ", "˙ㄅㄚ"]);
  assert.throws(() => rowsToTerms(parseWordList("鑫")));
  assert.throws(() => rowsToTerms([{ text: "學校", reading: "ㄒㄩㄝˊ", included: true }]));
  assert.throws(() => parseWordList("<script>alert(1)</script>"));
});

test("download payload roundtrips Unicode metadata and readings without copying practice identities", () => {
  const source = {
    id: "original",
    name: "我的題庫・一年級",
    publisher: "康軒",
    grade: "一年級",
    semester: "上學期",
    lessons: [
      {
        index: 19,
        title: "第一課：爸爸",
        terms: [{ text: "爸爸", syllables: ["ㄅㄚˋ", "˙ㄅㄚ"] }],
      },
      { index: 24, title: "第二課：飯", terms: [{ text: "飯", syllables: ["ㄈㄢˋ"] }] },
    ],
  };
  // Exercise the exact serializer and URI encoding used by the browser download link.
  const downloadText = decodeURIComponent(encodeURIComponent(serializeMaterialFile(source)));
  const parsed = parseMaterialFile(downloadText);
  assert.deepEqual(parsed, [source]);
  const existing = { ...initialMaterials, activeId: source.id, nextIndex: 25, materials: [source] };
  const imported = appendImportedMaterials(existing, parsed);
  assert.deepEqual(imported.materials[0], source);
  assert.deepEqual(
    imported.materials[1].lessons.map((lesson) => lesson.index),
    [25, 26],
  );
  assert.notEqual(imported.activeId, source.id);
  assert.deepEqual(
    imported.materials[1].lessons.map((lesson) => lesson.terms),
    source.lessons.map((lesson) => lesson.terms),
  );
  assert.equal(imported.materials[1].publisher, "康軒");
  assert.deepEqual(Object.keys(JSON.parse(downloadText)).sort(), [
    "format",
    "materials",
    "version",
  ]);
});

test("file import assigns fresh lesson identities and preserves old records", () => {
  const source = {
    id: "test",
    name: "我的題庫",
    publisher: "",
    grade: "",
    semester: "",
    lessons: [
      {
        index: 9,
        title: "本週聽寫",
        terms: [
          { text: "飯", syllables: ["ㄈㄢˋ"] },
          { text: "爸爸", syllables: ["ㄅㄚˋ", "˙ㄅㄚ"] },
        ],
      },
    ],
  };
  const parsed = parseMaterialFile(
    JSON.stringify({ format: "zhuyin-materials", version: 1, materials: [source] }),
  );
  const first = appendImportedMaterials(initialMaterials, parsed);
  const second = appendImportedMaterials(first, parsed);
  assert.equal(first.materials[0].lessons[0].index, 9);
  assert.equal(second.materials[1].lessons[0].index, 10);
  assert.notEqual(second.materials[0].id, second.materials[1].id);
  const restored = validateMaterials(JSON.parse(JSON.stringify(second)));
  const catalog = buildCatalog(restored);
  assert.equal(catalog.length, 14);
  const questions = buildListeningSession(10, catalog);
  assert.equal(questions.length, 2);
  assert.deepEqual(new Set(questions.map((q) => q.audioText)), new Set(["飯", "爸爸"]));
  assert.equal(findQuestionSeed(10, "words:爸爸", catalog)?.answer, "ㄅㄚˋ|˙ㄅㄚ");
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: { getItem: () => JSON.stringify(restored) } },
  });
  try {
    assert.equal(
      validatePracticeState({
        savedQuestions: [{ lessonIndex: 10, questionId: "words:爸爸", isFavorite: true }],
      }).savedQuestions.length,
      1,
    );
    assert.equal(
      validatedFillFavorites([
        {
          lessonIndex: 10,
          character: "爸",
          zhuyin: "ㄅㄚˋ",
          positions: [1],
          status: "review_later",
        },
      ]).length,
      1,
    );
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("invalid backup is rejected rather than silently replacing saved materials", () => {
  assert.throws(() => parseMaterialFile("{}"));
  assert.throws(() =>
    validateMaterials({
      version: 1,
      materials: [
        {
          id: "bad",
          name: "壞檔案",
          publisher: "",
          grade: "",
          semester: "",
          lessons: [{ index: 0, title: "課次", terms: [{ text: "飯", syllables: ["ㄈㄢˋ"] }] }],
        },
      ],
    }),
  );
  assert.equal(buildCatalog(initialMaterials)[0].index, 0);
});

test("title writing appends stable positions after existing body cells", () => {
  for (const lesson of builtinLessons) {
    const body = lesson.content.readingLines.flat();
    const cells = lesson.exercise.lines.flat();
    assert.deepEqual(cells.slice(0, body.length), body);
    assert.equal(
      cells
        .slice(body.length)
        .map((item) => item.character)
        .join(""),
      lesson.title,
    );
    assert.ok(cells.slice(body.length).every((item) => item.zhuyin.length > 0));
  }
  assert.equal(builtinLessons[3].exercise.lines.at(-1)?.length, 3);
});

test("three reviews follow each lesson group without changing existing lesson identities", () => {
  assert.deepEqual(
    builtinCatalog.map((lesson) => lesson.index),
    [0, 1, 2, -1, 3, 4, 5, -2, 6, 7, 8, -3],
  );
  assert.deepEqual(
    builtinReviews.map((lesson) => lesson.reviewRange),
    ["第1～3課", "第4～6課", "第7～9課"],
  );
  assert.ok(builtinReviews.every((lesson) => lesson.listeningOnly && lesson.terms.length > 0));
  assert.equal(validatePracticeState({ recentLesson: -1 }, 4, builtinCatalog).recentLesson, -1);
});

test("built-in, review and custom lesson identities never overlap", () => {
  for (let position = 0; position < 9; position++)
    assert.equal(builtinLessonIndex(position), position);
  // A future 10th textbook lesson must not take over a parent's first custom lesson.
  assert.equal(isCustomLessonIndex(builtinLessonIndex(9)), false);
  assert.notEqual(builtinLessonIndex(9), firstCustomLessonIndex);
  assert.equal(isCustomLessonIndex(firstCustomLessonIndex), true);
  for (const review of builtinCatalog.filter((lesson) => lesson.listeningOnly))
    assert.ok(review.index < 0 && !isCustomLessonIndex(review.index));
  assert.equal(builtinCatalog.filter((lesson) => !lesson.listeningOnly).length, lessons.length);
  // Imported materials cannot claim a built-in identity.
  const material = (index: number) => ({
    version: 1,
    activeId: "x",
    nextIndex: 10,
    materials: [
      {
        id: "x",
        name: "自訂",
        publisher: "",
        grade: "",
        semester: "",
        lessons: [{ index, title: "第十課", terms: [{ text: "貓", syllables: ["ㄇㄠ"] }] }],
      },
    ],
  });
  assert.equal(validateMaterials(material(firstCustomLessonIndex)).materials.length, 1);
  assert.throws(() => validateMaterials(material(builtinLessonIndex(9))));
  assert.throws(() => validateMaterials(material(8)));
});

test("every built-in lesson has its readings, vocabulary, artwork and numeral", () => {
  assert.equal(Object.keys(exercises).length, lessons.length);
  assert.equal(circledVocabulary.length, lessons.length);
  assert.equal(courseArtwork.length, lessons.length);
  assert.equal(lessonNumerals.length, lessons.length);
  for (const lesson of builtinLessons) {
    assert.ok(
      lesson.exercise.lines.flat().every((item) => item.zhuyin),
      lesson.title,
    );
    assert.ok(lesson.terms.length, lesson.title);
  }
});
