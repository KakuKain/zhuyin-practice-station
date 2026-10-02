import type { InkStroke } from "../types";

export function isFillCellComplete(
  index: number,
  strokes: Record<number, InkStroke[]>,
  pending: Record<number, InkStroke[]>,
) {
  return Boolean(strokes[index]?.length) && pending[index] === undefined;
}
