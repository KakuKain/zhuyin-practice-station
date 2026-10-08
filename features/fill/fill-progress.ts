import type { RefObject } from "react";
import type { InkStroke, SyllableItem, FillFavorite, PracticeSession, StateSetter } from "../types";
import { writeFillDraft } from "./fill-storage";
import { isFillCellComplete } from "./fill-draft-policy";
import { fillFavoriteKey } from "../practice/practice-storage";

type Params = {
  activeFillCell: number | null;
  fillDraftRef: RefObject<InkStroke[]>;
  fillStrokes: Record<number, InkStroke[]>;
  fillPendingCells: Record<number, InkStroke[]>;
  fillNeedsRetry: number[];
  fillLineStarts: number[];
  lessonLines: readonly (readonly SyllableItem[])[];
  lessonItems: SyllableItem[];
  selectedLesson: number;
  setStorageError: StateSetter<boolean>;
  setFillStrokes: StateSetter<Record<number, InkStroke[]>>;
  setFillPendingCells: StateSetter<Record<number, InkStroke[]>>;
  setActiveFillCell: StateSetter<number | null>;
  setFillParentChecked: StateSetter<boolean>;
  setCompletedFillLessons: StateSetter<number[]>;
  setFillNeedsRetry: StateSetter<number[]>;
  setFillFavorites: StateSetter<FillFavorite[]>;
  setFillReviewOpen: StateSetter<boolean>;
  persistFillRef: RefObject<() => void>;
  fillComplete: boolean;
  recordSession: (
    mode: PracticeSession["mode"],
    answered: number,
    correct: number,
    pending: number,
  ) => void;
  openFillReview: () => void;
};

export function useFillProgress({
  activeFillCell,
  fillDraftRef,
  fillStrokes,
  fillPendingCells,
  fillNeedsRetry,
  fillLineStarts,
  lessonLines,
  lessonItems,
  selectedLesson,
  setStorageError,
  setFillStrokes,
  setFillPendingCells,
  setActiveFillCell,
  setFillParentChecked,
  setCompletedFillLessons,
  setFillNeedsRetry,
  setFillFavorites,
  setFillReviewOpen,
  persistFillRef,
  fillComplete,
  recordSession,
  openFillReview,
}: Params) {
  const fillLineForCell = (index: number) =>
    fillLineStarts.findIndex(
      (start, lineIndex) => index >= start && index < start + lessonLines[lineIndex].length,
    );

  const openFillCell = (index: number) => {
    setFillReviewOpen(false);
    setActiveFillCell(index);
  };

  const saveFillDrawing = () => {
    if (activeFillCell === null || !fillDraftRef.current.length) return;
    const index = activeFillCell;
    const lineIndex = fillLineForCell(index);
    const wasFilled = Boolean(fillStrokes[index]?.length);
    const next = {
      ...fillStrokes,
      [index]: fillDraftRef.current.map((stroke) => stroke.map((point) => ({ ...point }))),
    };
    const pending = { ...fillPendingCells };
    delete pending[index];
    const remainingRetry = fillNeedsRetry.filter((item) => item !== index);
    try {
      writeFillDraft({
        version: 1,
        lessonIndex: selectedLesson,
        savedAt: Date.now(),
        strokes: next,
        pendingCells: pending,
        needsRetry: remainingRetry,
        reviewOpen: false,
      });
    } catch {
      setStorageError(true);
    }
    fillDraftRef.current = [];
    setFillStrokes(next);
    setFillPendingCells(pending);
    setActiveFillCell(null);
    setFillParentChecked(false);
    setCompletedFillLessons((current) => current.filter((item) => item !== selectedLesson));
    setFillNeedsRetry(remainingRetry);
    if (fillNeedsRetry.includes(index)) {
      const item = lessonItems[index];
      const key = fillFavoriteKey({ lessonIndex: selectedLesson, ...item });
      if (
        !remainingRetry.some(
          (position) =>
            lessonItems[position].character === item.character &&
            lessonItems[position].zhuyin === item.zhuyin,
        )
      ) {
        setFillFavorites((current) =>
          current.map((favorite) =>
            fillFavoriteKey(favorite) === key ? { ...favorite, status: "review_later" } : favorite,
          ),
        );
      }
    }
    if (wasFilled) {
      if (remainingRetry.length) setActiveFillCell(remainingRetry[0]);
      else if (lessonItems.every((_, itemIndex) => isFillCellComplete(itemIndex, next, pending)))
        openFillReview();
      return;
    }
    const lineStart = fillLineStarts[lineIndex];
    const nextEmpty = lessonLines[lineIndex].findIndex(
      (_, offset) => !isFillCellComplete(lineStart + offset, next, pending),
    );
    if (nextEmpty >= 0) setActiveFillCell(lineStart + nextEmpty);
    else if (lessonItems.every((_, itemIndex) => isFillCellComplete(itemIndex, next, pending)))
      openFillReview();
    else {
      const nextUnwritten = lessonItems.findIndex(
        (_, itemIndex) => !isFillCellComplete(itemIndex, next, pending),
      );
      if (nextUnwritten >= 0) setActiveFillCell(nextUnwritten);
    }
  };

  const leaveFillCell = () => {
    // Every real edit already recorded pending ink; merely viewing a completed
    // cell must not turn it back into unfinished work.
    if (activeFillCell !== null) persistFillRef.current();
    setActiveFillCell(null);
  };

  const confirmFillReview = () => {
    if (fillNeedsRetry.length || !fillComplete) return;
    setFillReviewOpen(false);
    setFillParentChecked(true);
    setCompletedFillLessons((current) =>
      current.includes(selectedLesson) ? current : [...current, selectedLesson],
    );
    recordSession("fill", lessonItems.length, lessonItems.length, 0);
  };
  return { fillLineForCell, openFillCell, saveFillDrawing, leaveFillCell, confirmFillReview };
}
