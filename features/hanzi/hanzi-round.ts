import { childKey } from "../../lib/storage/child-profiles";
import { storageKeys } from "../../lib/storage/storage-keys";
import { book1Lessons } from "./book1-characters";

/**
 * How much of the model a child sees: 描一描 (the character in pale ink, the next stroke's start
 * numbered), 看著寫 (the character, fainter, without numbers) or 自己寫 (an empty square).
 */
export type StrokeLevel = "trace" | "faint" | "blank";
export const strokeLevels: StrokeLevel[] = ["trace", "faint", "blank"];

/** 生字 per round: short enough to stay a game. */
export const roundSize = 5;
/** At most this many 生字 that were hard last time come back in one round. */
const hardPerRound = 2;

export type CharacterRecord = {
  /** Finished in a round. */
  practised: number;
  /** Finished after at least one stroke needed a hint, the last few times. */
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
export function recordHanziRound(
  results: { character: string; hinted: boolean }[],
  now = Date.now(),
) {
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
 * A round of a lesson's 生字: up to two that were hard, then the least practised, in the book's
 * order so the round follows the lesson.
 */
export function buildHanziRound(
  lessonId: number,
  records = readHanziRecords(),
  random = Math.random,
): string[] {
  const lesson = book1Lessons.find((item) => item.id === lessonId) ?? book1Lessons[0];
  const characters = [...lesson.characters];
  const record = (character: string) =>
    records.characters[character] ?? { practised: 0, hard: 0, at: 0 };
  const hard = characters
    .filter((character) => record(character).hard > 0)
    .sort((a, b) => record(b).hard - record(a).hard || record(a).at - record(b).at)
    .slice(0, hardPerRound);
  const rest = characters
    .filter((character) => !hard.includes(character))
    .map((character) => ({ character, order: record(character).practised + random() }))
    .sort((a, b) => a.order - b.order)
    .slice(0, roundSize - hard.length)
    .map((item) => item.character);
  const chosen = new Set([...hard, ...rest]);
  return characters.filter((character) => chosen.has(character));
}
