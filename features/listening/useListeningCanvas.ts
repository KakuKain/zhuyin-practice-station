"use client";

import { useRef } from "react";
import { useInkCanvas } from "../../lib/ink/useInkCanvas";
import type { ListenPhase, ListeningQuestion, View } from "../types";

type Options = {
  view: View;
  listenPhase: ListenPhase;
  listenIndex: number;
  currentQuestion: ListeningQuestion;
  isWordQuestion: boolean;
  wordLength: number;
};

export function useListeningCanvas({
  view,
  listenPhase,
  listenIndex,
  currentQuestion,
  isWordQuestion,
  wordLength,
}: Options) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const editor = useInkCanvas({
    scope: `${view}:${listenIndex}:${currentQuestion.id}`,
    mounted: view === "listen" && listenPhase !== "ready",
    enabled: view === "listen" && (listenPhase === "active" || listenPhase === "retry"),
    count: isWordQuestion ? wordLength : 1,
    getCanvas: (index) => (isWordQuestion ? wordCanvasRefs.current[index] : canvasRef.current),
  });
  return {
    wordInk: editor.ink,
    hasInk: Boolean(editor.ink[0]),
    canvasRef,
    wordCanvasRefs,
    clearCanvas: editor.reset,
    clearWordCanvas: editor.clear,
    clearListeningCell: editor.clear,
    listeningEraserCell: editor.eraserCell,
    listeningUndoAvailable: editor.undoAvailable,
    listeningInkNotice: editor.notice,
    toggleListeningEraser: editor.toggleEraser,
    undoListeningInk: editor.undo,
    beginDrawing: editor.begin,
    draw: editor.move,
    endDrawing: editor.end,
  };
}
