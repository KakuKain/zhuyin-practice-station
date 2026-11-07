import type { InkStroke } from "../types";
import { childKey } from "../../lib/storage/child-profiles";
import { storageKeys } from "../../lib/storage/storage-keys";
import { book1Lessons, book1Readings } from "./book1-characters";
import { book1Words, callReadings, characterCalls, type DictationWord } from "./book1-words";
import { readHanziRecords } from "./hanzi-round";
import { characterStrokes } from "./HanziChrome";
import { fromSquare, judgeStroke, screenMedian, type Point } from "./stroke-match";

/** 只考生字 (each 生字 called as 「拍手的拍」) or 全部語詞 (the teacher's ten). */
export type DictationMode = "characters" | "words";
/** 生字 asked in one 只考生字 round; the teacher's sheets have ten 語詞 too. */
export const charactersPerRound = 10;

export type DictationItem = DictationWord & {
  /** What is played: the 語詞, or the 生字's call. */
  call: string;
  callReadings: string;
};

export type DictationRound = {
  version: 1;
  id: number;
  lessonId: number;
  mode: DictationMode;
  items: DictationItem[];
  index: number;
  /** Per item, one canvas a cell: the 田字格 and its 注音 strip (see cellParts). */
  ink: InkStroke[][][];
};

const characterItem = (character: string): DictationItem => ({
  text: character,
  readings: book1Readings[character],
  call: characterCalls[character],
  callReadings: callReadings(character),
});
const wordItem = (word: DictationWord): DictationItem => ({
  ...word,
  call: word.text,
  callReadings: word.readings,
});

/** Hard 生字 first, then the others at random, up to ten; the 語詞 in a random order. */
export function buildDictation(
  lessonId: number,
  mode: DictationMode,
  random = Math.random,
): DictationRound {
  const lesson = book1Lessons.find((item) => item.id === lessonId) ?? book1Lessons[1];
  const shuffle = <T>(list: T[]) =>
    list
      .map((value) => ({ value, order: random() }))
      .sort((a, b) => a.order - b.order)
      .map((item) => item.value);
  let items: DictationItem[];
  if (mode === "words") items = shuffle(book1Words[lessonId] ?? []).map(wordItem);
  else {
    const records = readHanziRecords();
    const characters = shuffle([...lesson.characters]).sort(
      (a, b) => (records.characters[b]?.hard ?? 0) - (records.characters[a]?.hard ?? 0),
    );
    items = shuffle(characters.slice(0, charactersPerRound)).map(characterItem);
  }
  return { version: 1, id: Date.now(), lessonId, mode, items, index: 0, ink: items.map(() => []) };
}

const roundKey = () => childKey(storageKeys.hanziDictation);

/** The unfinished round, so a reload or a closed app keeps what was written. */
export function readDictation(lessonId: number): DictationRound | null {
  try {
    const raw = window.localStorage.getItem(roundKey());
    const value = raw ? (JSON.parse(raw) as DictationRound) : null;
    if (
      !value ||
      value.version !== 1 ||
      value.lessonId !== lessonId ||
      !Array.isArray(value.items) ||
      !Array.isArray(value.ink) ||
      value.items.length !== value.ink.length
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
export function saveDictation(round: DictationRound) {
  try {
    window.localStorage.setItem(roundKey(), JSON.stringify(round));
    return true;
  } catch {
    return false;
  }
}
export function clearDictation() {
  try {
    window.localStorage.removeItem(roundKey());
  } catch {
    // Nothing kept to clear.
  }
}

/**
 * A cell's canvas is square and as wide as the cell, so ink is never stretched; the cell shows its
 * top three quarters. The 田字格 is the left 75 units, the 注音 strip the right 25, both 75 high.
 */
export const cellSplit = 75;
/** A cell's strokes split by where each mostly lies: the 田字格's, scaled to 0–100, and the strip's. */
export function cellParts(strokes: InkStroke[]) {
  const square: InkStroke[] = [];
  const strip: InkStroke[] = [];
  for (const stroke of strokes) {
    if (!stroke.length) continue;
    const x = stroke.reduce((sum, point) => sum + point.x, 0) / stroke.length;
    if (x < cellSplit)
      square.push(
        stroke.map((point) => ({
          ...point,
          x: (point.x * 100) / cellSplit,
          y: (point.y * 100) / cellSplit,
        })),
      );
    else strip.push(stroke);
  }
  return { square, strip };
}

/**
 * Whether a 生字 written freely in its square follows the book's strokes: the writing is moved
 * and scaled onto the model (a child writes small, or off to one side), then each stroke must
 * match the stroke of the same number. Returns the first stroke that does not, from 1, or 0.
 */
export function checkWritten(character: string, strokes: InkStroke[]): { ok: boolean; at: number } {
  const data = characterStrokes[character];
  if (!data) return { ok: false, at: 1 };
  const medians = data.medians.map(screenMedian);
  const written = strokes.filter((stroke) => stroke.length).map((stroke) => stroke.map(fromSquare));
  if (!written.length) return { ok: false, at: 1 };
  const box = (points: Point[]) => {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  };
  const model = box(medians.flat());
  const ink = box(written.flat());
  const scale =
    Math.max(model.x1 - model.x0, model.y1 - model.y0, 1) /
    Math.max(ink.x1 - ink.x0, ink.y1 - ink.y0, 1);
  const fit = ({ x, y }: Point): Point => ({
    x: (model.x0 + model.x1) / 2 + (x - (ink.x0 + ink.x1) / 2) * scale,
    y: (model.y0 + model.y1) / 2 + (y - (ink.y0 + ink.y1) / 2) * scale,
  });
  for (let i = 0; i < medians.length; i++) {
    if (!written[i] || judgeStroke(written[i].map(fit), medians, i, 1.4) !== "match")
      return { ok: false, at: i + 1 };
  }
  return written.length === medians.length
    ? { ok: true, at: 0 }
    : { ok: false, at: medians.length + 1 };
}
