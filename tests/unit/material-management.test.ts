import test from "node:test";
import assert from "node:assert/strict";
import {
  archiveLesson,
  archiveMaterial,
  moveLesson,
  moveMaterial,
  replaceLesson,
  updateMaterial,
} from "../../features/courses/material-actions";
import {
  appendImportedMaterials,
  buildCatalog,
  initialMaterials,
  parseMaterialFile,
  readMaterials,
  serializeMaterialFile,
  validateMaterials,
  materialsStorageKey,
} from "../../features/courses/materials";
import { createPersistentStore } from "../../lib/storage/persistent-store";
const bank = () =>
  appendImportedMaterials(initialMaterials, [
    {
      id: "source",
      name: "本週字詞",
      publisher: "康軒",
      grade: "一年級",
      semester: "上學期",
      lessons: [
        { index: 9, title: "第一課", terms: [{ text: "半", syllables: ["ㄅㄢˋ"] }] },
        { index: 10, title: "第二課", terms: [{ text: "飯", syllables: ["ㄈㄢˋ"] }] },
      ],
    },
  ]);

test("renaming and sorting preserve identities; archiving hides only the course surface", () => {
  const state = bank(),
    id = state.activeId;
  const named = updateMaterial(state, id, {
    name: "康軒一年級上",
    publisher: "康軒",
    grade: "一年級",
    semester: "上學期",
  });
  const moved = moveLesson(named, id, 10, -1);
  assert.deepEqual(
    moved.materials[0].lessons.map((lesson) => lesson.index),
    [10, 9],
  );
  const hidden = archiveLesson(moved, id, 10, true);
  assert.equal(buildCatalog(hidden).find((lesson) => lesson.index === 10)?.archived, true);
  assert.equal(buildCatalog(hidden).find((lesson) => lesson.index === 9)?.number, "1");
  const archived = archiveMaterial(hidden, id, true);
  assert.equal(archived.activeId, initialMaterials.activeId);
  assert.equal(buildCatalog(archived).length, 14);
  const restored = archiveMaterial(archived, id, false);
  const open = archiveLesson(restored, id, 10, false);
  assert.deepEqual(
    open.materials[0].lessons.map((lesson) => lesson.index),
    [10, 9],
  );
  assert.equal(state.materials[0].name, "本週字詞");
});

test("editing content creates a new identity and preserves the old answer for drafts and favorites", () => {
  const state = bank(),
    id = state.activeId;
  const renamed = replaceLesson(state, id, 9, {
    title: "改課名",
    terms: state.materials[0].lessons[0].terms,
  });
  assert.equal(renamed.contentChanged, false);
  assert.equal(renamed.state.materials[0].lessons[0].index, 9);
  const revised = replaceLesson(renamed.state, id, 9, {
    title: "改課名",
    terms: [{ text: "飯", syllables: ["ㄈㄢˋ"] }],
  });
  assert.equal(revised.contentChanged, true);
  const lessons = revised.state.materials[0].lessons;
  assert.equal(lessons[0].index, 11);
  assert.equal(lessons[0].revisionOf, 9);
  assert.equal(lessons[1].archived, true);
  assert.equal(
    buildCatalog(revised.state).find((lesson) => lesson.index === 9)?.exercise.lines[0][0].zhuyin,
    "ㄅㄢˋ",
  );
  const refreshed = validateMaterials(JSON.parse(JSON.stringify(revised.state)));
  assert.equal(refreshed.nextIndex, 12);
  const exported = parseMaterialFile(serializeMaterialFile(refreshed.materials[0]));
  assert.equal(exported[0].lessons.length, 3);
  assert.equal(exported[0].lessons[1].archived, true);
  assert.deepEqual(exported[0].lessons[1].terms, lessons[1].terms);
});

test("material sorting and restored reading adapters do not duplicate textbook content", () => {
  const first = bank();
  const state = appendImportedMaterials(first, [
    { ...first.materials[0], id: "another", name: "另一教材" },
  ]);
  const sorted = moveMaterial(state, state.materials[1].id, -1);
  assert.equal(sorted.materials[0].name, "另一教材");
  const lesson = buildCatalog(sorted).find((lesson) => lesson.custom)!;
  assert.equal(lesson.content.readingLines, lesson.exercise.lines);
  assert.equal(lesson.content.terms, lesson.terms);
  assert.throws(
    () =>
      parseMaterialFile(
        JSON.stringify({ format: "zhuyin-materials", version: 1, materials: [null] }),
      ),
    /教材格式/,
  );
});

test("storage confirms the write result, keeps failed edits in memory, and never overwrites unread banks", (t) => {
  const data = new Map<string, string>([[materialsStorageKey, JSON.stringify(bank())]]);
  let fail = false;
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (fail) throw new Error("quota");
      data.set(key, value);
    },
  } as Storage;
  const old = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage, addEventListener() {}, removeEventListener() {} },
  });
  t.after(() => {
    if (old) Object.defineProperty(globalThis, "window", old);
    else Reflect.deleteProperty(globalThis, "window");
  });
  const store = createPersistentStore(
    materialsStorageKey,
    initialMaterials,
    readMaterials,
    validateMaterials,
    { protectUnreadData: true },
  );
  const unsubscribe = store.subscribe(() => {});
  const next = updateMaterial(store.getSnapshot().value, store.getSnapshot().value.activeId, {
    name: "已保存",
    publisher: "",
    grade: "",
    semester: "",
  });
  assert.equal(store.setValue(next), true);
  assert.equal(readMaterials(storage).materials[0].name, "已保存");
  const persisted = data.get(materialsStorageKey);
  fail = true;
  assert.equal(store.setValue({ ...next, activeId: initialMaterials.activeId }), false);
  assert.equal(store.getSnapshot().value.activeId, initialMaterials.activeId);
  assert.equal(data.get(materialsStorageKey), persisted);
  unsubscribe();
  fail = false;
  data.set(materialsStorageKey, "{damaged original");
  const damaged = createPersistentStore(
    materialsStorageKey,
    initialMaterials,
    readMaterials,
    validateMaterials,
    { protectUnreadData: true },
  );
  const close = damaged.subscribe(() => {});
  assert.equal(damaged.setValue(bank()), false);
  assert.equal(damaged.getSnapshot().value.materials.length, 1);
  assert.equal(data.get(materialsStorageKey), "{damaged original");
  close();
});
