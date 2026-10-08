import assert from "node:assert/strict";
import test from "node:test";
import { validateFillDraft } from "../../features/fill/fill-storage";
import {
  validatePracticeState,
  validatedFillFavorites,
  readPracticeState,
  practiceStorageKey,
  initialPracticeState,
  thirdPracticeStorageKey,
} from "../../features/practice/practice-storage";
import { validateListeningSettings } from "../../features/settings/listening-settings";
import { createPersistentStore } from "../../lib/storage/persistent-store";

const strokes = [
  [
    { x: 10, y: 20 },
    { x: 80, y: 90 },
  ],
];
const draft = {
  version: 1,
  lessonIndex: 0,
  savedAt: 1,
  strokes: { 0: strokes },
  pendingCells: { 0: strokes },
  needsRetry: [],
  reviewOpen: false,
};

test("draft validation rejects unsafe or incompatible data without mutating input", () => {
  const valid = validateFillDraft(draft, 0, 14)!;
  assert.deepEqual(valid.pendingCells, {});
  assert.deepEqual(draft.pendingCells, { 0: strokes });
  for (const input of [
    null,
    [],
    { ...draft, version: 2 },
    { ...draft, savedAt: NaN },
    { ...draft, lessonIndex: 8 },
    { ...draft, needsRetry: [14] },
    { ...draft, strokes: { 0: [[{ x: Infinity, y: 10 }]] } },
    { ...draft, strokes: { 0: [[{ x: -1, y: 10 }]] } },
    { ...draft, strokes: {}, pendingCells: {} },
  ])
    assert.equal(validateFillDraft(input, 0, 14), null);
});

test("v1, v2 and v3 favorites survive migration, dedupe and invalid records", () => {
  for (const [version, questionIndex] of [
    [1, 0],
    [2, 4],
  ] as const)
    assert.equal(
      validatePracticeState({ savedQuestions: [{ lessonIndex: 0, questionIndex }] }, version)
        .savedQuestions[0].questionId,
      "characters:貓",
    );
  const parsed = validatePracticeState({
    savedQuestions: [
      { lessonIndex: 0, questionId: "symbols:ㄅ" },
      { lessonIndex: 0, questionId: "symbols:ㄅ" },
      { lessonIndex: 0.5, questionId: "symbols:ㄅ" },
      null,
      { lessonIndex: 0, questionId: "gone" },
    ],
    recentLesson: 8,
    completedSessions: 3.9,
  });
  assert.equal(parsed.savedQuestions.length, 1);
  assert.equal(parsed.completedSessions, 3);
  assert.equal(parsed.recentLesson, 8);
  const favorites = validatedFillFavorites([
    { lessonIndex: 0, character: "咪", zhuyin: "ㄇㄧ", positions: [0, 1, 12] },
    { lessonIndex: 0, character: "咪", zhuyin: "ㄇㄧ", positions: [1, 2], status: "needs_rewrite" },
  ]);
  assert.deepEqual(favorites[0].positions, [0, 1, 2]);
  assert.equal(favorites[0].status, "needs_rewrite");
  assert.deepEqual(validateListeningSettings(null), {
    repeatCount: 2,
    intervalSeconds: 8,
    answerTime: "standard",
  });
  assert.deepEqual(validateListeningSettings({ repeatCount: 3, intervalSeconds: 10 }), {
    repeatCount: 3,
    intervalSeconds: 10,
    answerTime: "standard",
  });
});

test("hydration never overwrites existing records; quota failures keep in-memory progress", (t) => {
  const data = new Map([
    [
      practiceStorageKey,
      JSON.stringify({
        savedQuestions: [{ lessonIndex: 0, questionId: "symbols:ㄅ" }],
        recentLesson: 2,
        completedSessions: 1,
      }),
    ],
  ]);
  let fail = false;
  const localStorage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (fail) throw new Error("quota");
      data.set(key, value);
    },
  } as Storage;
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage, addEventListener() {}, removeEventListener() {} },
  });
  t.after(() => {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  });
  const initial = initialPracticeState;
  const store = createPersistentStore(
    practiceStorageKey,
    initial,
    readPracticeState,
    validatePracticeState,
  );
  assert.equal(store.getServerSnapshot().value, initial);
  const before = data.get(practiceStorageKey);
  const unsubscribe = store.subscribe(() => {});
  assert.equal(data.get(practiceStorageKey), before);
  assert.equal(store.getSnapshot().value.savedQuestions.length, 1);
  fail = true;
  store.setValue((current) => ({ ...current, completedSessions: 2 }));
  assert.equal(store.getSnapshot().value.completedSessions, 2);
  assert.equal(store.getSnapshot().error, true);
  assert.equal(data.get(practiceStorageKey), before);
  unsubscribe();
});

test("v3 migration preserves pending work and all legacy stars; v4 merges flags", () => {
  const raw = {
    savedQuestions: [{ lessonIndex: 0, questionId: "symbols:ㄅ", needsPractice: true }],
  };
  const storage = {
    getItem: (key: string) => (key === thirdPracticeStorageKey ? JSON.stringify(raw) : null),
  } as Storage;
  assert.deepEqual(readPracticeState(storage).savedQuestions[0], {
    lessonIndex: 0,
    questionId: "symbols:ㄅ",
    isFavorite: true,
    needsPractice: true,
  });
  const savedQuestions = validatePracticeState({
    savedQuestions: [
      { lessonIndex: 0, questionId: "symbols:ㄅ", isFavorite: false, needsPractice: true },
      { lessonIndex: 0, questionId: "symbols:ㄅ", isFavorite: true, needsPractice: false },
      { lessonIndex: 0, questionId: "symbols:ㄆ", isFavorite: false, needsPractice: false },
    ],
  }).savedQuestions;
  assert.equal(savedQuestions.length, 1);
  assert.equal(savedQuestions[0].isFavorite, true);
  assert.equal(savedQuestions[0].needsPractice, true);
});

test("fill favorites follow a corrected built-in reading instead of being dropped", () => {
  const [favorite] = validatedFillFavorites([
    {
      lessonIndex: 5,
      character: "教",
      zhuyin: "ㄐㄧㄠˋ",
      positions: [14, 23],
      status: "needs_rewrite",
      isFavorite: true,
    },
  ]);
  assert.deepEqual(favorite, {
    lessonIndex: 5,
    character: "教",
    zhuyin: "ㄐㄧㄠ",
    positions: [14, 23],
    status: "needs_rewrite",
    isFavorite: true,
  });
  // A different character at the stored position still cannot claim it.
  assert.deepEqual(
    validatedFillFavorites([
      { lessonIndex: 5, character: "學", zhuyin: "ㄒㄩㄝˊ", positions: [14], isFavorite: true },
    ]),
    [],
  );
});
