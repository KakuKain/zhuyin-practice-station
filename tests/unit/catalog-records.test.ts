import assert from "node:assert/strict";
import test from "node:test";
import { buildCatalog, builtinCatalog, initialMaterials } from "../../features/courses/materials";
import {
  fillLocation,
  readPracticeState,
  validatePracticeState,
  validatedFillFavorites,
} from "../../features/practice/practice-storage";
import { createPersistentStore } from "../../lib/storage/persistent-store";

const catalog = buildCatalog({
  ...initialMaterials,
  materials: [
    {
      id: "custom",
      name: "自訂",
      publisher: "",
      grade: "",
      semester: "",
      lessons: [{ index: 9, title: "第一課", terms: [{ text: "飯", syllables: ["ㄈㄢˋ"] }] }],
    },
  ],
});
const saved = { lessonIndex: 9, questionId: "characters:飯", isFavorite: true };
const favorite = {
  lessonIndex: 9,
  character: "飯",
  zhuyin: "ㄈㄢˋ",
  positions: [0],
  status: "review_later",
  isFavorite: true,
};
const raw = {
  savedQuestions: [saved],
  recentLesson: 9,
  history: [
    {
      id: "session",
      lessonIndex: 9,
      mode: "fill",
      completedAt: 1,
      answeredUnits: 1,
      correctUnits: 1,
      pendingQuestions: 0,
    },
  ],
};

test("explicit catalog validates custom records independently of browser storage", () => {
  assert.equal(validatePracticeState(raw, 4, catalog).savedQuestions.length, 1);
  assert.equal(validatedFillFavorites([favorite], catalog).length, 1);
  assert.equal(fillLocation(9, 0, catalog), "第 1 行第 1 格");
  assert.equal(validatePracticeState(raw, 4, builtinCatalog).savedQuestions.length, 0);
  const storage = {
    getItem: (key: string) => {
      assert.equal(key, "zhuyin-practice-state-v4");
      return JSON.stringify(raw);
    },
  } as Storage;
  assert.equal(readPracticeState(storage, catalog).savedQuestions.length, 1);
});

test("temporarily unavailable materials retain structurally valid records during hydration", () => {
  const pending = validatePracticeState(raw, 4, builtinCatalog, true);
  assert.equal(pending.savedQuestions.length, 1);
  assert.equal(pending.history.length, 1);
  assert.equal(pending.recentLesson, 9);
  assert.equal(validatedFillFavorites([favorite], builtinCatalog, true).length, 1);
  assert.equal(
    validatePracticeState(
      { savedQuestions: [{ ...saved, questionId: "malformed" }] },
      4,
      builtinCatalog,
      true,
    ).savedQuestions.length,
    0,
  );
  assert.equal(
    validatedFillFavorites(
      [{ ...favorite, positions: [-1, 200], character: "<" }],
      builtinCatalog,
      true,
    ).length,
    0,
  );
  assert.equal(validatePracticeState(pending, 4, catalog, true).savedQuestions.length, 1);
});

test("available course content rejects mismatched readings instead of attaching old work to new text", () => {
  const changed = catalog.map((lesson) =>
    lesson.index === 9
      ? {
          ...lesson,
          terms: [{ text: "半", syllables: ["ㄅㄢˋ"] }],
          exercise: { lines: [[{ character: "半", zhuyin: "ㄅㄢˋ" }]], questions: [] },
        }
      : lesson,
  );
  assert.equal(validatedFillFavorites([favorite], changed, true).length, 0);
  assert.equal(validatePracticeState(raw, 4, changed, true).savedQuestions.length, 0);
});

test("failed practice persistence preserves in-memory custom records and reports the failure", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: () => JSON.stringify(raw),
        setItem: () => {
          throw new Error("quota");
        },
      },
      addEventListener() {},
      removeEventListener() {},
    },
  });
  try {
    // The practice store uses the same delayed catalog validation policy as the collection hook.
    const records = createPersistentStore(
      "records",
      validatePracticeState(null, 4, builtinCatalog),
      (storage) => readPracticeState(storage, builtinCatalog, true),
      (value) => validatePracticeState(value, 4, catalog, true),
    );
    const unsubscribe = records.subscribe(() => {});
    records.setValue((current) => ({
      ...current,
      completedSessions: current.completedSessions + 1,
    }));
    assert.equal(records.getSnapshot().error, true);
    assert.equal(records.getSnapshot().value.savedQuestions.length, 1);
    assert.equal(records.getSnapshot().value.completedSessions, 1);
    unsubscribe();
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
