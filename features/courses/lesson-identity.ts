/**
 * Lesson indexes are permanent identities: drafts, favorites, history and recordings are
 * stored against them. Three ranges never overlap:
 *
 * - built-in lessons 1–9 keep 0–8;
 * - reviews use negative indexes;
 * - custom lessons start at 9 and only grow (an edit creates a new index);
 * - built-in lessons added after the first nine use laterBuiltinLessonBase + position, so a
 *   10th textbook lesson can never take over a parent's first custom lesson (index 9).
 */
export const firstCustomLessonIndex = 9;
export const laterBuiltinLessonBase = 1_000_000;

export const builtinLessonIndex = (position: number) =>
  position < firstCustomLessonIndex ? position : laterBuiltinLessonBase + position;

export const isCustomLessonIndex = (index: number) =>
  Number.isSafeInteger(index) && index >= firstCustomLessonIndex && index < laterBuiltinLessonBase;
