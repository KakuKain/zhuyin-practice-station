import { useCallback, useEffect } from "react";
import type { RefObject } from "react";
import type { FillDraft, InkStroke, StateSetter, View } from "../types";
import { clearFillDraft, writeFillDraft } from "./fill-storage";
import { shouldCaptureFillCell } from "./fill-draft-policy";
type Options = {
  view: View;
  fillDraftReady: boolean;
  fillResumeDraft: FillDraft | null;
  fillParentChecked: boolean;
  selectedLesson: number;
  fillPendingCells: Record<number, InkStroke[]>;
  activeFillCell: number | null;
  fillStrokes: Record<number, InkStroke[]>;
  fillNeedsRetry: number[];
  fillReviewOpen: boolean;
  fillDraftRef: RefObject<InkStroke[]>;
  fillActiveStrokeRef: RefObject<InkStroke | null>;
  persistFillRef: RefObject<() => void>;
  hasFillDraft: boolean;
  setStorageError: StateSetter<boolean>;
};
export function useFillDraft({
  view,
  fillDraftReady,
  fillResumeDraft,
  fillParentChecked,
  selectedLesson,
  fillPendingCells,
  activeFillCell,
  fillStrokes,
  fillNeedsRetry,
  fillReviewOpen,
  fillDraftRef,
  fillActiveStrokeRef,
  persistFillRef,
  hasFillDraft,
  setStorageError,
}: Options) {
  const persistFillDraft = useCallback(
    (includeCanvas = false) => {
      if (view !== "fill" || !fillDraftReady || fillResumeDraft) return;
      try {
        if (fillParentChecked) {
          clearFillDraft(selectedLesson);
          return;
        }
        const pendingCells = { ...fillPendingCells };
        if (includeCanvas && activeFillCell !== null) {
          const strokes = [
            ...fillDraftRef.current,
            ...(fillActiveStrokeRef.current?.length ? [fillActiveStrokeRef.current] : []),
          ];
          if (shouldCaptureFillCell(activeFillCell, strokes, fillStrokes, pendingCells))
            pendingCells[activeFillCell] = strokes;
        }
        if (!Object.keys(fillStrokes).length && !Object.keys(pendingCells).length) {
          clearFillDraft(selectedLesson);
          return;
        }
        writeFillDraft({
          version: 1,
          lessonIndex: selectedLesson,
          savedAt: Date.now(),
          strokes: fillStrokes,
          pendingCells,
          needsRetry: fillNeedsRetry,
          reviewOpen: fillReviewOpen,
        });
      } catch {
        queueMicrotask(() => setStorageError(true));
      }
    },
    [
      view,
      fillDraftReady,
      fillResumeDraft,
      fillParentChecked,
      selectedLesson,
      fillPendingCells,
      activeFillCell,
      fillStrokes,
      fillNeedsRetry,
      fillReviewOpen,
      fillDraftRef,
      fillActiveStrokeRef,
      setStorageError,
    ],
  );

  useEffect(() => {
    persistFillRef.current = () => persistFillDraft(true);
  }, [persistFillRef, persistFillDraft]);

  useEffect(() => {
    if (view === "fill" && fillDraftReady && !fillResumeDraft) persistFillDraft();
  }, [view, fillDraftReady, fillResumeDraft, persistFillDraft]);

  useEffect(() => {
    const flush = () => persistFillRef.current();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (
        view !== "fill" ||
        !fillDraftReady ||
        fillResumeDraft ||
        fillParentChecked ||
        (!hasFillDraft && !fillActiveStrokeRef.current?.length)
      )
        return;
      flush();
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [
    view,
    fillDraftReady,
    fillResumeDraft,
    fillParentChecked,
    hasFillDraft,
    fillActiveStrokeRef,
    persistFillRef,
  ]);
}
