import type { InkStroke } from "../types";

export function isFillCellComplete(
  index: number,
  strokes: Record<number, InkStroke[]>,
  pending: Record<number, InkStroke[]>,
) {
  return Boolean(strokes[index]?.length) && pending[index] === undefined;
}

export function shouldCaptureFillCell(
  index: number,
  ink: InkStroke[],
  strokes: Record<number, InkStroke[]>,
  pending: Record<number, InkStroke[]>,
) {
  // Preserve explicit clears, but merely opening a blank cell is not a draft.
  if (pending[index] !== undefined) return true;
  // Reopening a completed cell without edits shows the same ink; that is not a draft either.
  if (strokes[index]?.length) return JSON.stringify(ink) !== JSON.stringify(strokes[index]);
  return ink.length > 0;
}
