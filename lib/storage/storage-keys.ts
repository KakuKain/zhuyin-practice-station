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
  freeBoard: "kid-free-dictation-v1",
} as const;

/** One draft per lesson index; reviews (negative indexes) have no handwriting drafts. */
export const fillDraftStorageKey = (lessonIndex: number) => `zhuyin-fill-draft-v1-${lessonIndex}`;
const fillDraftKeyPattern = /^zhuyin-fill-draft-v1-(\d+)$/;

/** The lesson index of a fill draft key, or null for any other key. */
export function fillDraftKeyIndex(key: string): number | null {
  const match = fillDraftKeyPattern.exec(key);
  return match ? Number(match[1]) : null;
}

const fixedKeys: ReadonlySet<string> = new Set(Object.values(storageKeys));
export const ownsStorageKey = (key: string) =>
  fixedKeys.has(key) || fillDraftKeyIndex(key) !== null;

/** IndexedDB database for custom recordings; included in device backup. */
export const customAudioDatabase = "zhuyin-custom-audio-v1";
