"use client";

import { useRef, useState } from "react";
import type { RefObject } from "react";
import { cloneInk } from "../../lib/ink/ink-path";
import { useInkCanvas } from "../../lib/ink/useInkCanvas";
import type { FillFavorite, InkStroke, StateSetter, View } from "../types";

type Options = {
  view: View;
  activeFillCell: number | null;
  fillPracticePhase: "writing" | "review";
  fillPracticeTarget: FillFavorite | null;
  fillStrokes: Record<number, InkStroke[]>;
  fillNeedsRetry: number[];
  fillPendingCells: Record<number, InkStroke[]>;
  fillParentChecked: boolean;
  selectedLesson: number;
  setFillParentChecked: StateSetter<boolean>;
  setCompletedFillLessons: StateSetter<number[]>;
  setFillPendingCells: StateSetter<Record<number, InkStroke[]>>;
  persistFillRef: RefObject<() => void>;
};

export function useFillCanvas({
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
  persistFillRef,
}: Options) {
  const [fillIsDirty, setFillIsDirty] = useState(false);
  const fillCanvasRef = useRef<HTMLCanvasElement>(null);
  const fillDraftRef = useRef<InkStroke[]>([]);
  const [fillHasInk, setFillHasInk] = useState(false);
  const practice = view === "fill-practice";
  const mounted =
    (view === "fill" && activeFillCell !== null) ||
    (practice && fillPracticePhase === "writing" && fillPracticeTarget !== null);
  const editor = useInkCanvas({
    scope: `${view}:${selectedLesson}:${activeFillCell}:${practice ? fillPracticePhase : ""}:${fillPracticeTarget?.character ?? ""}`,
    mounted,
    enabled: mounted,
    count: 1,
    getCanvas: () => fillCanvasRef.current,
    readInitial: () => {
      const saved =
        practice || activeFillCell === null
          ? []
          : (fillPendingCells[activeFillCell] ??
            (fillNeedsRetry.includes(activeFillCell) ? [] : (fillStrokes[activeFillCell] ?? [])));
      fillDraftRef.current = cloneInk(saved);
      setFillHasInk(saved.length > 0);
      setFillIsDirty(false);
      return saved;
    },
    onChange: (_, strokes) => {
      fillDraftRef.current = cloneInk(strokes);
      setFillHasInk(strokes.length > 0);
      setFillIsDirty(true);
      if (view === "fill" && activeFillCell !== null) {
        if (fillParentChecked) {
          setFillParentChecked(false);
          setCompletedFillLessons((current) => current.filter((index) => index !== selectedLesson));
        }
        // Explicit empty drafts prevent a cleared saved cell from reappearing.
        setFillPendingCells((current) => ({ ...current, [activeFillCell]: cloneInk(strokes) }));
        persistFillRef.current();
      }
    },
  });
  return {
    fillHasInk,
    setFillHasInk,
    fillIsDirty,
    setFillIsDirty,
    fillCanvasRef,
    fillDraftRef,
    fillActiveStrokeRef: editor.activeStrokeRef,
    fillEraserActive: editor.eraserCell === 0,
    fillCanUndo: Boolean(editor.undoAvailable[0]),
    fillInkNotice: editor.notice,
    toggleFillEraser: editor.toggleEraser,
    undoFillInk: editor.undo,
    beginFillDrawing: (event: React.PointerEvent<HTMLCanvasElement>) => {
      editor.begin(event);
      if (!editor.activeStrokeRef.current) return;
      setFillIsDirty(true);
      if (view === "fill" && fillParentChecked) {
        setFillParentChecked(false);
        setCompletedFillLessons((current) => current.filter((index) => index !== selectedLesson));
      }
    },
    moveFillDrawing: editor.move,
    endFillDrawing: editor.end,
    clearFillDrawing: () => editor.clear(),
  };
}
