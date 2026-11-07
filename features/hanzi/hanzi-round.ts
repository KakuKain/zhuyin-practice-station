import { childKey } from "../../lib/storage/child-profiles";
import { storageKeys } from "../../lib/storage/storage-keys";

/** A 生字 is written twice in 練習: traced over the model, then in an empty square. */
export type StrokeStep = "trace" | "blank";

/** 生字 finished in one visit before the 集章卡 stamps it (fewer when the lesson has fewer). */
export const stampAfter = 5;

export type CharacterRecord = {
  /** Times written to the end in 練習. */
  practised: number;
  /** Raised when a stroke needed a hint, lowered by a clean finish (0–3). */
  hard: number;
  at: number;
};
/** A 語詞 written wrong in 聽寫, for 語詞 practice to bring back. */
export type WordRecord = { wrong: number; at: number };
export type HanziRecords = {
  version: 1;
  characters: Record<string, CharacterRecord>;
  words: Record<string, WordRecord>;
};

export function readHanziRecords(): HanziRecords {
  try {
    const raw = window.localStorage.getItem(childKey(storageKeys.hanziRecords));
    const value = raw ? (JSON.parse(raw) as Partial<HanziRecords>) : null;
    const characters: Record<string, CharacterRecord> = {};
    if (value?.characters && typeof value.characters === "object")
      for (const [character, record] of Object.entries(value.characters))
        if (
          record &&
          Number.isFinite(record.practised) &&
          Number.isFinite(record.hard) &&
          Number.isFinite(record.at)
        )
          characters[character] = record;
    const words: Record<string, WordRecord> = {};
    if (value?.words && typeof value.words === "object")
      for (const [text, record] of Object.entries(value.words))
        if (record && Number.isFinite(record.wrong) && Number.isFinite(record.at))
          words[text] = record;
    return { version: 1, characters, words };
  } catch {
    return { version: 1, characters: {}, words: {} };
  }
}

/** Records each finished 生字: a hint makes it harder (up to 3), a clean round eases it by one. */
export function recordHanzi(results: { character: string; hinted: boolean }[], now = Date.now()) {
  const records = readHanziRecords();
  for (const { character, hinted } of results) {
    const before = records.characters[character] ?? { practised: 0, hard: 0, at: 0 };
    records.characters[character] = {
      practised: before.practised + 1,
      hard: hinted ? Math.min(before.hard + 1, 3) : Math.max(before.hard - 1, 0),
      at: now,
    };
  }
  try {
    window.localStorage.setItem(childKey(storageKeys.hanziRecords), JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

/**
 * 聽寫's results after the parent's check: a 生字 written wrong becomes harder (so 只考生字 asks
 * it first and the list keeps it in view), a 語詞 written wrong is kept for 語詞 practice.
 */
export function recordDictation(
  results: { text: string; right: boolean; character: boolean }[],
  now = Date.now(),
) {
  const records = readHanziRecords();
  for (const { text, right, character } of results) {
    if (right) continue;
    if (character) {
      const before = records.characters[text] ?? { practised: 0, hard: 0, at: 0 };
      records.characters[text] = { ...before, hard: Math.min(before.hard + 1, 3), at: now };
    } else {
      const before = records.words[text] ?? { wrong: 0, at: 0 };
      records.words[text] = { wrong: before.wrong + 1, at: now };
    }
  }
  try {
    window.localStorage.setItem(childKey(storageKeys.hanziRecords), JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}
