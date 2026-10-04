import type { LessonExercise, ListeningSeed, SyllableItem } from "../types";
import type { CircledTerm } from "./circled-vocabulary";

/** Textbook content is independent of the way a child answers a practice. */
export type LessonContent = {
  textLines: readonly string[];
  readingLines: readonly (readonly SyllableItem[])[];
  terms: readonly CircledTerm[];
  symbols: readonly string[];
};

/** Existing zhuyin screens consume this adapter; character-writing can share the content later. */
export function createZhuyinExercise(
  content: LessonContent,
  questions: readonly ListeningSeed[] = [],
): LessonExercise {
  return { lines: content.readingLines, questions };
}
