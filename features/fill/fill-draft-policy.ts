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
  return ink.length > 0 || pending[index] !== undefined || Boolean(strokes[index]?.length);
}
