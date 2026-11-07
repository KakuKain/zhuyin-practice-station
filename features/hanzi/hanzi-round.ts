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
export type HanziRecords = { version: 1; characters: Record<string, CharacterRecord> };

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
    return { version: 1, characters };
  } catch {
    return { version: 1, characters: {} };
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
