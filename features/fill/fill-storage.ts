import type { FillDraft, InkStroke } from "../types";
import { fillDraftStorageKey } from "../../lib/storage/storage-keys";

export { fillDraftStorageKey };

/**
 * Older versions also set an unread `zhuyin_fill_draft_<n>` marker cookie with `Path=/`,
 * which every page on the same host received. Drafts live only in localStorage now.
 */
export function expireLegacyDraftCookies() {
  if (typeof document === "undefined") return;
  for (const entry of document.cookie.split(";")) {
    const name = entry.split("=")[0].trim();
    if (/^zhuyin_fill_draft_-?\d+$/.test(name))
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
}

export const validInkStrokes = (value: unknown): value is InkStroke[] =>
  Array.isArray(value) &&
  // A partial erase may split one original stroke into several fragments.
  value.length <= 2000 &&
  value.every(
    (stroke) =>
      Array.isArray(stroke) &&
      stroke.length > 0 &&
      stroke.length <= 2000 &&
      stroke.every(
        (point) =>
          point &&
          typeof point.x === "number" &&
          typeof point.y === "number" &&
          Number.isFinite(point.x) &&
          Number.isFinite(point.y) &&
          point.x >= 0 &&
          point.x <= 100 &&
          point.y >= 0 &&
          point.y <= 100 &&
          (point.width === undefined ||
            (typeof point.width === "number" &&
              Number.isFinite(point.width) &&
              point.width > 0 &&
              point.width <= 10)),
      ),
  );

export function readFillDraft(lessonIndex: number, cellCount: number): FillDraft | null {
  try {
    const raw = window.localStorage.getItem(fillDraftStorageKey(lessonIndex));
    if (!raw) return null;
    return validateFillDraft(JSON.parse(raw), lessonIndex, cellCount);
  } catch {
    return null;
  }
}

export function validateFillDraft(
  raw: unknown,
  lessonIndex: number,
  cellCount: number,
): FillDraft | null {
  try {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const draft = structuredClone(raw) as FillDraft;
    if (!Number.isFinite(draft.savedAt) || draft.savedAt < 0) return null;
    if (
      draft?.version !== 1 ||
      draft.lessonIndex !== lessonIndex ||
      !draft.strokes ||
      typeof draft.strokes !== "object" ||
      Array.isArray(draft.strokes)
    )
      return null;
    if (
      !Object.entries(draft.strokes).every(
        ([key, strokes]) =>
          Number.isInteger(Number(key)) &&
          Number(key) >= 0 &&
          Number(key) < cellCount &&
          validInkStrokes(strokes),
      )
    )
      return null;
    if (
      !draft.pendingCells ||
      typeof draft.pendingCells !== "object" ||
      Array.isArray(draft.pendingCells) ||
      !Object.entries(draft.pendingCells).every(
        ([key, strokes]) =>
          Number.isInteger(Number(key)) &&
          Number(key) >= 0 &&
          Number(key) < cellCount &&
          validInkStrokes(strokes),
      )
    )
      return null;
    if (
      !Array.isArray(draft.needsRetry) ||
      !draft.needsRetry.every(
        (index) => Number.isInteger(index) && index >= 0 && index < cellCount,
      ) ||
      typeof draft.reviewOpen !== "boolean"
    )
      return null;
    // An interrupted save can leave a completed cell in both collections.
    // The duplicate pending copy must not mask the completed preview.
    for (const [key, pending] of Object.entries(draft.pendingCells)) {
      if (
        draft.strokes[Number(key)] &&
        JSON.stringify(draft.strokes[Number(key)]) === JSON.stringify(pending)
      )
        delete draft.pendingCells[Number(key)];
    }
    return Object.keys(draft.strokes).length || Object.keys(draft.pendingCells).length
      ? draft
      : null;
  } catch {
    return null;
  }
}

export function writeFillDraft(draft: FillDraft) {
  window.localStorage.setItem(fillDraftStorageKey(draft.lessonIndex), JSON.stringify(draft));
}

export function clearFillDraft(lessonIndex: number) {
  window.localStorage.removeItem(fillDraftStorageKey(lessonIndex));
}
