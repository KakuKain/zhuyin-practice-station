import { useState } from "react";
import type { FillDraft, FillFavorite, InkStroke, View } from "../types";

export function useFillSession() {
  const [fillStrokes, setFillStrokes] = useState<Record<number, InkStroke[]>>({});
  const [fillPendingCells, setFillPendingCells] = useState<Record<number, InkStroke[]>>({});
  const [fillDraftReady, setFillDraftReady] = useState(false);
  const [fillResumeDraft, setFillResumeDraft] = useState<FillDraft | null>(null);
  const [fillExitTarget, setFillExitTarget] = useState<View | null>(null);
  const [activeFillCell, setActiveFillCell] = useState<number | null>(null);
  const [fillReviewOpen, setFillReviewOpen] = useState(false);
  const [fillNeedsRetry, setFillNeedsRetry] = useState<number[]>([]);
  const [fillParentChecked, setFillParentChecked] = useState(false);
  const [fillPracticeTarget, setFillPracticeTarget] = useState<FillFavorite | null>(null);
  const [fillPracticePhase, setFillPracticePhase] = useState<"writing" | "review">("writing");
  const [fillPracticeStrokes, setFillPracticeStrokes] = useState<InkStroke[]>([]);
  const [fillPracticeExitOpen, setFillPracticeExitOpen] = useState(false);
  const [draftStorageError, setStorageError] = useState(false);
  const [completedFillLessons, setCompletedFillLessons] = useState<number[]>([]);
  return {
    fillStrokes,
    setFillStrokes,
    fillPendingCells,
    setFillPendingCells,
    fillDraftReady,
    setFillDraftReady,
    fillResumeDraft,
    setFillResumeDraft,
    fillExitTarget,
    setFillExitTarget,
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
    fillPracticeStrokes,
    setFillPracticeStrokes,
    fillPracticeExitOpen,
    setFillPracticeExitOpen,
    draftStorageError,
    setStorageError,
    completedFillLessons,
    setCompletedFillLessons,
  };
}
