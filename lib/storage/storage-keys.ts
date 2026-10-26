/**
 * Every browser storage key this site owns, in one place. Device backup exports and restores
 * exactly these keys; anything else in localStorage belongs to other sites on the same origin
 * (GitHub Pages shares one origin per account) and is never read or touched.
 *
 * Adding a key: add it here, read it through a validator that tolerates older shapes, and
 * describe it in device-backup's preview if it holds user work.
 */
export const storageKeys = {
  materials: "zhuyin-materials-v1",
  practice: "zhuyin-practice-state-v4",
  /** Older practice records, read only to migrate into v4. */
  practiceV3: "zhuyin-practice-state-v3",
  practiceV2: "zhuyin-practice-state-v2",
  practiceV1: "zhuyin-practice-state-v1",
  fillFavorites: "zhuyin-fill-favorites-v1",
  listeningSettings: "zhuyin-listening-settings-v1",
  /** The unfinished whole-lesson listening round, so a reload or a closed app can resume it. */
  listeningRound: "zhuyin-listening-round-v1",
  freeBoard: "kid-free-dictation-v1",
  /** Who practises on this device and who is practising now (child-profiles.ts). */
  children: "zhuyin-children-v1",
  /** 第一課's unfinished math round, so a reload or a closed app can continue it. */
  mathRound: "kid-math-round-v1",
  /** Finished math rounds and what the parent marked to practise again. */
  mathRecords: "kid-math-records-v1",
  /** What each math lesson's last round showed, so the next avoids those numbers and pictures. */
  mathRecent: "kid-math-recent-v1",
  /** Finished English rounds and what to practise again. */
  englishRecords: "kid-english-records-v1",
  /** What each English lesson's last round asked, so the next asks other letters and words. */
  englishRecent: "kid-english-recent-v1",
  /** 集章卡: each child's stamps, the log of what earned them and the rewards chosen. */
  stamps: "kid-stamps-v1",
  /** 集章卡 settings the family shares: on or off, card size, daily stamps and rewards. */
  rewardSettings: "kid-reward-settings-v1",
  /** Where the floating 集章卡 button was dragged to on this device. */
  rewardDock: "kid-reward-dock-v1",
} as const;

/**
 * Records that belong to one child. The first child ("main") keeps these exact keys, so nothing
 * moves when a second child is added; every other child stores them as `<key>@<child id>`.
 * Materials, listening settings and recordings stay shared by the whole family.
 */
export const mainChildId = "main";
export const childScopedKeys: ReadonlySet<string> = new Set([
  storageKeys.practice,
  storageKeys.fillFavorites,
  storageKeys.listeningRound,
  storageKeys.freeBoard,
  storageKeys.mathRound,
  storageKeys.mathRecords,
  storageKeys.mathRecent,
  storageKeys.englishRecords,
  storageKeys.englishRecent,
  storageKeys.stamps,
]);
const childSuffixPattern = /@([a-z0-9]{1,12})$/;
export const isChildId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-z0-9]{1,12}$/.test(value);

/** A child's own copy of a key; the first child uses the key itself. */
export const childStorageKey = (key: string, childId: string) =>
  childId === mainChildId ? key : `${key}@${childId}`;

/** The shared key and the child a stored key belongs to ("main" when it has no suffix). */
export function splitChildKey(key: string): { key: string; childId: string } {
  const match = childSuffixPattern.exec(key);
  return match
    ? { key: key.slice(0, match.index), childId: match[1] }
    : { key, childId: mainChildId };
}

/** Session-only: a child was chosen in this app session, so a reload does not ask again. */
export const childChosenSessionKey = "zhuyin-child-chosen";

/** One draft per lesson index and child; reviews (negative indexes) have no handwriting drafts. */
export const fillDraftStorageKey = (lessonIndex: number, childId = mainChildId) =>
  childStorageKey(`zhuyin-fill-draft-v1-${lessonIndex}`, childId);
const fillDraftKeyPattern = /^zhuyin-fill-draft-v1-(\d+)$/;

/** The lesson index of a fill draft key (any child's), or null for any other key. */
export function fillDraftKeyIndex(key: string): number | null {
  const match = fillDraftKeyPattern.exec(splitChildKey(key).key);
  return match ? Number(match[1]) : null;
}

/** One unfinished round per math lesson and child; 第一課 keeps the original key. */
export const mathRoundStorageKey = (lessonId: number) =>
  lessonId === 1 ? storageKeys.mathRound : `${storageKeys.mathRound}-${lessonId}`;
const mathRoundKeyPattern = /^kid-math-round-v1-\d+$/;

/** One unfinished 寫一寫 round per English lesson and child. */
export const englishRoundStorageKey = (lessonId: number) => `kid-english-round-v1-${lessonId}`;
const englishRoundKeyPattern = /^kid-english-round-v1-\d+$/;

/** Keys made per lesson (fill drafts, math and English rounds), for any child. */
export const isLessonRecordKey = (key: string) => {
  const shared = splitChildKey(key).key;
  return (
    fillDraftKeyIndex(shared) !== null ||
    mathRoundKeyPattern.test(shared) ||
    englishRoundKeyPattern.test(shared)
  );
};

const fixedKeys: ReadonlySet<string> = new Set(Object.values(storageKeys));
export function ownsStorageKey(key: string) {
  const { key: shared, childId } = splitChildKey(key);
  if (childId !== mainChildId) return childScopedKeys.has(shared) || isLessonRecordKey(shared);
  return fixedKeys.has(key) || isLessonRecordKey(key);
}

/** IndexedDB database for custom recordings; included in device backup. */
export const customAudioDatabase = "zhuyin-custom-audio-v1";
