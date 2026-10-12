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

const fixedKeys: ReadonlySet<string> = new Set(Object.values(storageKeys));
export function ownsStorageKey(key: string) {
  const { key: shared, childId } = splitChildKey(key);
  if (childId !== mainChildId)
    return childScopedKeys.has(shared) || fillDraftKeyIndex(shared) !== null;
  return fixedKeys.has(key) || fillDraftKeyIndex(key) !== null;
}

/** IndexedDB database for custom recordings; included in device backup. */
export const customAudioDatabase = "zhuyin-custom-audio-v1";
