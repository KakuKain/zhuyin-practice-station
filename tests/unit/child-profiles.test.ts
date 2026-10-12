import assert from "node:assert/strict";
import test from "node:test";
import {
  childStorageKey,
  fillDraftStorageKey,
  ownsStorageKey,
  splitChildKey,
  storageKeys,
} from "../../lib/storage/storage-keys";
import {
  addChild,
  chooseChild,
  childProfiles,
  needsChildChoice,
  removeChild,
  resetChildProfilesCache,
  validateChildProfiles,
} from "../../lib/storage/child-profiles";
import { readPracticeState } from "../../features/practice/practice-storage";
import { prepareDeviceBackup, snapshotStorage } from "../../lib/storage/device-backup";
import { withChildMaterial } from "../../features/courses/useMaterials";
import { builtinMaterialId, initialMaterials } from "../../features/courses/materials";

class MemoryStorage implements Storage {
  data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

function withBrowser(t: test.TestContext) {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage, sessionStorage, addEventListener() {}, removeEventListener() {} },
  });
  resetChildProfilesCache();
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
    resetChildProfilesCache();
  });
  return { localStorage, sessionStorage };
}

const saved = (questionId: string) =>
  JSON.stringify({
    savedQuestions: [{ lessonIndex: 0, questionId, isFavorite: true, needsPractice: true }],
    recentLesson: 0,
    completedSessions: 0,
    history: [],
  });

test("the first child keeps every key; others own a suffixed copy of their records only", () => {
  assert.equal(childStorageKey(storageKeys.practice, "main"), storageKeys.practice);
  assert.equal(childStorageKey(storageKeys.practice, "k2"), `${storageKeys.practice}@k2`);
  assert.equal(fillDraftStorageKey(3, "k2"), "zhuyin-fill-draft-v1-3@k2");
  assert.deepEqual(splitChildKey("zhuyin-fill-draft-v1-3@k2"), {
    key: "zhuyin-fill-draft-v1-3",
    childId: "k2",
  });
  for (const key of [
    `${storageKeys.practice}@k2`,
    `${storageKeys.fillFavorites}@k3`,
    `${storageKeys.listeningRound}@k2`,
    `${storageKeys.freeBoard}@k2`,
    "zhuyin-fill-draft-v1-0@k2",
    storageKeys.children,
  ])
    assert.ok(ownsStorageKey(key), key);
  // Shared settings have no per-child copies, and other sites' keys are never ours.
  for (const key of [
    `${storageKeys.materials}@k2`,
    `${storageKeys.listeningSettings}@k2`,
    `${storageKeys.practice}@K2`,
    "other-site@k2",
  ])
    assert.equal(ownsStorageKey(key), false, key);
});

test("a second child starts empty and never reads the first child's records", (t) => {
  const { localStorage } = withBrowser(t);
  localStorage.setItem(storageKeys.practiceV3, saved("words:皮包"));
  assert.equal(readPracticeState(localStorage, undefined, true, "main").savedQuestions.length, 1);
  assert.equal(readPracticeState(localStorage, undefined, true, "k2").savedQuestions.length, 0);
  localStorage.setItem(`${storageKeys.practice}@k2`, saved("words:毛衣"));
  assert.equal(
    readPracticeState(localStorage, undefined, true, "k2").savedQuestions[0].questionId,
    "words:毛衣",
  );
});

test("removing a child deletes only that child's records", (t) => {
  const { localStorage } = withBrowser(t);
  const id = addChild("妹妹", "rabbit")!;
  assert.equal(id, "k2");
  for (const key of [
    storageKeys.practice,
    storageKeys.practiceV2,
    "zhuyin-fill-draft-v1-0",
    storageKeys.materials,
    `${storageKeys.practice}@k2`,
    `${storageKeys.freeBoard}@k2`,
    "zhuyin-fill-draft-v1-0@k2",
    "other-site-key",
  ])
    localStorage.setItem(key, "{}");
  chooseChild("k2");
  assert.ok(removeChild("k2"));
  assert.deepEqual(
    [...localStorage.data.keys()].filter((key) => key !== storageKeys.children).sort(),
    [
      "other-site-key",
      storageKeys.materials,
      storageKeys.practice,
      storageKeys.practiceV2,
      "zhuyin-fill-draft-v1-0",
    ].sort(),
  );
  assert.equal(childProfiles().activeId, "main");
  // The last child stays.
  assert.equal(removeChild("main"), false);
  addChild("哥哥", "dog");
  assert.ok(removeChild("main"));
  assert.deepEqual(
    [...localStorage.data.keys()].filter((key) => key !== storageKeys.children).sort(),
    ["other-site-key", storageKeys.materials].sort(),
  );
});

test("each app session asks who is practising once there are two children", (t) => {
  const { sessionStorage } = withBrowser(t);
  assert.equal(needsChildChoice(), false);
  addChild("妹妹", "rabbit");
  // Adding is done by the parent; this session keeps going.
  assert.equal(needsChildChoice(), false);
  sessionStorage.clear();
  assert.equal(needsChildChoice(), true);
  chooseChild("k2");
  assert.equal(needsChildChoice(), false);
  assert.equal(childProfiles().activeId, "k2");
});

test("damaged child lists fall back without losing the valid children", () => {
  assert.deepEqual(
    validateChildProfiles(null).children.map((child) => child.id),
    ["main"],
  );
  const profiles = validateChildProfiles({
    activeId: "gone",
    children: [
      { id: "main", name: "  哥哥是很長的名字喔喔  ", avatar: "dragon" },
      { id: "main", name: "duplicate" },
      { id: "Bad Id", name: "x" },
      { id: "k2", name: "妹妹", avatar: "rabbit" },
    ],
  });
  assert.deepEqual(profiles, {
    version: 1,
    activeId: "main",
    children: [
      { id: "main", name: "哥哥是很長的名字", avatar: "cat" },
      { id: "k2", name: "妹妹", avatar: "rabbit" },
    ],
  });
});

test("device backup keeps every child's records and describes them together", (t) => {
  const { localStorage } = withBrowser(t);
  addChild("妹妹", "rabbit");
  localStorage.setItem(storageKeys.practice, saved("words:皮包"));
  localStorage.setItem(`${storageKeys.practice}@k2`, saved("words:毛衣"));
  localStorage.setItem("other-site-key", "{}");
  const storage = snapshotStorage(localStorage);
  assert.deepEqual(
    Object.keys(storage).sort(),
    [storageKeys.children, storageKeys.practice, `${storageKeys.practice}@k2`].sort(),
  );
  const prepared = prepareDeviceBackup({
    format: "zhuyin-device-backup",
    version: 1,
    createdAt: 1,
    storage,
    recordings: [],
  });
  assert.equal(prepared.summary.children, 2);
  assert.equal(prepared.summary.saved, 2);
});

test("each child opens their own material while it is still available", () => {
  const family = {
    ...initialMaterials,
    activeId: "home",
    materials: [
      { id: "home", name: "家裡的", publisher: "", grade: "", semester: "", lessons: [] },
      {
        id: "old",
        name: "舊的",
        publisher: "",
        grade: "",
        semester: "",
        lessons: [],
        archived: true,
      },
    ],
  };
  assert.equal(withChildMaterial(family, builtinMaterialId).activeId, builtinMaterialId);
  assert.equal(withChildMaterial(family, undefined).activeId, "home");
  // An archived or deleted choice falls back to the family's material.
  assert.equal(withChildMaterial(family, "old").activeId, "home");
  assert.equal(withChildMaterial(family, "gone").activeId, "home");
  assert.equal(
    validateChildProfiles({ children: [{ id: "k2", name: "妹妹", materialId: "home" }] })
      .children[0].materialId,
    "home",
  );
});
