import type { InkStroke } from "../types";
import { childKey } from "../../lib/storage/child-profiles";
import { storageKeys } from "../../lib/storage/storage-keys";
import { book1Lessons, book1Readings } from "./book1-characters";
import { book1Words, callReadings, characterCalls, type DictationWord } from "./book1-words";
import { readHanziRecords } from "./hanzi-round";
import { characterStrokes } from "./HanziChrome";
import { fromSquare, screenMedian, strokeDistance, type Point } from "./stroke-match";

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

type Box = { x0: number; y0: number; x1: number; y1: number };
const boxOf = (points: Point[]): Box => {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
};
/**
 * Moves and scales writing in `from` onto `to`, each axis on its own (a child's 生字 is often
 * narrower or taller than the model); a flat side (一) takes the other side's scale.
 */
function fitter(from: Box, to: Box) {
  const w = from.x1 - from.x0;
  const h = from.y1 - from.y0;
  const big = Math.max(w, h, 1);
  const sx = w > big * 0.2 ? (to.x1 - to.x0) / w : NaN;
  const sy = h > big * 0.2 ? (to.y1 - to.y0) / h : NaN;
  const scaleX = Number.isFinite(sx) ? sx : sy;
  const scaleY = Number.isFinite(sy) ? sy : sx;
  return ({ x, y }: Point): Point => ({
    x: (to.x0 + to.x1) / 2 + (x - (from.x0 + from.x1) / 2) * scaleX,
    y: (to.y0 + to.y1) / 2 + (y - (from.y0 + from.y1) / 2) * scaleY,
  });
}

/**
 * Whether a 生字 written freely in its square follows the book's strokes: stroke n must match the
 * book's stroke n. The writing is first moved and scaled onto the model (a child writes small, off
 * to one side, or narrower); fitted three ways (on every stroke, on the strokes the 生字 has, or
 * not at all), the best counts, so a stray mark such as a tone written near the square does not
 * throw the whole 生字 off. Returns the first stroke that does not match, from 1, or 0.
 */
export type WrittenCheck = {
  ok: boolean;
  /** The first stroke that does not match, from 1, or 0. */
  at: number;
  /** Strokes written, not counting a short stray mark after the last. */
  count: number;
  /** Strokes the 生字 has. */
  expected: number;
};
export function checkWritten(character: string, strokes: InkStroke[]): WrittenCheck {
  const data = characterStrokes[character];
  if (!data) return { ok: false, at: 1, count: 0, expected: 0 };
  const medians = data.medians.map(screenMedian);
  const expected = medians.length;
  const written = strokes.filter((stroke) => stroke.length).map((stroke) => stroke.map(fromSquare));
  if (!written.length) return { ok: false, at: 1, count: 0, expected };
  // A short mark after the last stroke (a tone that strayed out of its strip) is not a stroke.
  const length = (stroke: Point[]) =>
    stroke.reduce(
      (sum, p, i) => (i ? sum + Math.hypot(p.x - stroke[i - 1].x, p.y - stroke[i - 1].y) : 0),
      0,
    );
  const count = expected + written.slice(expected).filter((stroke) => length(stroke) > 150).length;
  const writtenCount = Math.min(written.length, count);
  // With a different number of strokes, fitting the writing onto the model misplaces even the
  // right ones, so the count is what is wrong.
  if (writtenCount !== expected)
    return { ok: false, at: Math.min(writtenCount, expected) + 1, count: writtenCount, expected };
  const model = boxOf(medians.flat());
  const fits = [
    fitter(boxOf(written.flat()), model),
    fitter(boxOf(written.slice(0, medians.length).flat()), model),
    (point: Point) => point,
  ];
  let best = 0;
  for (const fit of fits) {
    let matched = 0;
    while (
      matched < medians.length &&
      written[matched] &&
      strokeDistance(written[matched].map(fit), medians[matched], 1.5) < Infinity
    )
      matched += 1;
    best = Math.max(best, matched);
  }
  return best < expected
    ? { ok: false, at: best + 1, count: expected, expected }
    : { ok: true, at: 0, count: expected, expected };
}
