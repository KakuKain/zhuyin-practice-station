import { useSyncExternalStore } from "react";

/**
 * What happened to pen contacts since the app opened, shown under 更多 → 版本 so a parent
 * can report how the real tablet behaves. Kept in memory only.
 */
export type InkCounts = {
  /** A lift and a quick touch nearby that were joined into one stroke. */
  rejoined: number;
  /** The system cancelled a contact mid-stroke. */
  cancelled: number;
  /** A palm-sized sample ended the rest of a stroke. */
  palmCut: number;
  /** Another touch while one was writing, ignored. */
  secondTouch: number;
};

let counts: InkCounts = { rejoined: 0, cancelled: 0, palmCut: 0, secondTouch: 0 };
const listeners = new Set<() => void>();

export function countInk(kind: keyof InkCounts) {
  counts = { ...counts, [kind]: counts[kind] + 1 };
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useInkCounts() {
  return useSyncExternalStore(
    subscribe,
    () => counts,
    () => counts,
  );
}
