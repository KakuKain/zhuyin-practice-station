import { useRef } from "react";
import type { FillFavorite, PracticeSession, StateSetter, View } from "../types";
import type { fillLayout } from "./fill-layout";
import { useFillSession } from "./useFillSession";
import { useFillCanvas } from "./useFillCanvas";
import { useFillDraft } from "./useFillDraft";
import { useFillProgress } from "./fill-progress";
import { clearFillDraft, readFillDraft } from "./fill-storage";
import { isFillCellComplete } from "./fill-draft-policy";

type Options = {
  view: View;
  setView: StateSetter<View>;
  selectedLesson: number;
  setSelectedLesson: StateSetter<number>;
  layout: ReturnType<typeof fillLayout>;
  showLoading: (message: string) => void;
  setFillFavorites: StateSetter<FillFavorite[]>;
  unfavoriteFill: (favorite: FillFavorite) => void;
  markFillMastered: (favorite: FillFavorite) => void;
  recordSession: (
    mode: PracticeSession["mode"],
    answered: number,
    correct: number,
    pending: number,
  ) => void;
  setPracticeNotice: StateSetter<string>;
  setUnfavoriteUndo: (value: null) => void;
  clearNotices: () => void;
  /** Called when a single-cell practice ends inside a course review queue. */
  continueReview: () => void;
  stopReview: () => void;
};

/**
 * Handwriting dictation of a whole lesson (sheet → cell → parent review) and single-cell
 * practice of a saved favorite. Drafts persist per lesson through useFillDraft.
 */
export function useFillFlow({
  view,
  setView,
  selectedLesson,
  setSelectedLesson,
  layout,
  showLoading,
  setFillFavorites,
  unfavoriteFill,
  markFillMastered,
  recordSession,
  setPracticeNotice,
  setUnfavoriteUndo,
  clearNotices,
  continueReview,
  stopReview,
}: Options) {
  const session = useFillSession();
  const {
    fillStrokes,
    setFillStrokes,
    fillPendingCells,
    setFillPendingCells,
    fillDraftReady,
    setFillDraftReady,
    fillResumeDraft,
    setFillResumeDraft,
    activeFillCell,
    setActiveFillCell,
    fillReviewOpen,
    setFillReviewOpen,
    fillNeedsRetry,
    setFillNeedsRetry,
    fillParentChecked,
    setFillParentChecked,
    fillPracticeTarget,
    setFillPracticeTarget,
    fillPracticePhase,
    setFillPracticePhase,
    setFillPracticeStrokes,
    setStorageError,
    setCompletedFillLessons,
  } = session;
  const { lessonLines, lessonItems, fillLineStarts } = layout;
  const persistFillRef = useRef<() => void>(() => {});

  const writtenCount = lessonItems.filter((_, index) =>
    isFillCellComplete(index, fillStrokes, fillPendingCells),
  ).length;
  const fillComplete = writtenCount === lessonItems.length;

  const canvas = useFillCanvas({
    view,
    activeFillCell,
    fillPracticePhase,
    fillPracticeTarget,
    fillStrokes,
    fillNeedsRetry,
    fillPendingCells,
    fillParentChecked,
    selectedLesson,
    setFillParentChecked,
    setCompletedFillLessons,
    setFillPendingCells,
  });
  const { fillHasInk, setFillHasInk, setFillIsDirty, fillDraftRef, fillActiveStrokeRef } = canvas;

  const hasFillDraft =
    writtenCount > 0 || Object.keys(fillPendingCells).length > 0 || (view === "fill" && fillHasInk);
  useFillDraft({
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
  });

  const openFillReview = () => setFillReviewOpen(true);

  const progress = useFillProgress({
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
  });

  const openFill = () => {
    showLoading("正在準備默寫格…");
    clearNotices();
    const draft = readFillDraft(selectedLesson, lessonItems.length);
    setFillStrokes({});
    setFillPendingCells({});
    setActiveFillCell(null);
    setFillReviewOpen(false);
    setFillNeedsRetry([]);
    setFillParentChecked(false);
    setFillHasInk(false);
    fillDraftRef.current = [];
    setFillResumeDraft(draft);
    setFillDraftReady(!draft);
    setCompletedFillLessons((current) => current.filter((index) => index !== selectedLesson));
    setView("fill");
  };

  const resumeFillDraft = () => {
    if (!fillResumeDraft) return;
    setFillStrokes(fillResumeDraft.strokes);
    setFillPendingCells(fillResumeDraft.pendingCells);
    setFillNeedsRetry(fillResumeDraft.needsRetry);
    setFillReviewOpen(fillResumeDraft.reviewOpen);
    setActiveFillCell(null);
    setFillResumeDraft(null);
    setFillDraftReady(true);
  };

  const restartFillDraft = () => {
    try {
      clearFillDraft(selectedLesson);
    } catch {
      setStorageError(true);
    }
    setFillStrokes({});
    setFillPendingCells({});
    setFillNeedsRetry([]);
    setFillReviewOpen(false);
    setActiveFillCell(null);
    fillDraftRef.current = [];
    setFillResumeDraft(null);
    setFillDraftReady(true);
  };

  const rewriteFillCell = (index: number) => {
    setFillNeedsRetry((current) => (current.includes(index) ? current : [...current, index]));
    progress.openFillCell(index);
  };

  const openFillFavorite = (favorite: FillFavorite, queued = false) => {
    if (!queued) stopReview();
    showLoading("正在開啟單題重練…");
    setFillPracticeTarget(favorite);
    setSelectedLesson(favorite.lessonIndex);
    setFillPracticePhase("writing");
    setFillPracticeStrokes([]);
    setFillHasInk(false);
    setFillIsDirty(false);
    clearNotices();
    setView("fill-practice");
  };

  const deferFillPractice = () => {
    setPracticeNotice("已保留這題，下次可以再練。");
    setView("practice");
    continueReview();
  };
  const removeFillFavorite = (favorite: FillFavorite) => {
    setUnfavoriteUndo(null);
    unfavoriteFill(favorite);
    setFillPracticeTarget(null);
    setView("practice");
  };
  const markFillFavoritePracticed = (favorite: FillFavorite) => {
    setUnfavoriteUndo(null);
    markFillMastered(favorite);
    recordSession("single", 1, 1, 0);
    setFillPracticeTarget(null);
    setView("practice");
    continueReview();
  };

  return {
    ...session,
    ...canvas,
    ...progress,
    persistFillRef,
    writtenCount,
    fillComplete,
    hasFillDraft,
    openFill,
    resumeFillDraft,
    restartFillDraft,
    openFillReview,
    rewriteFillCell,
    openFillFavorite,
    deferFillPractice,
    removeFillFavorite,
    markFillFavoritePracticed,
  };
}
