import { useRef } from "react";
import { useInkCanvas } from "../../lib/ink/useInkCanvas";
import type { InkStroke, ListenPhase, ListeningQuestion, View } from "../types";

type Options = {
  view: View;
  listenPhase: ListenPhase;
  listenIndex: number;
  currentQuestion: ListeningQuestion;
  isWordQuestion: boolean;
  wordLength: number;
  readDraft?: (questionIndex: number, cellIndex: number) => InkStroke[];
};

export function useListeningCanvas({
  view,
  listenPhase,
  listenIndex,
  currentQuestion,
  isWordQuestion,
  wordLength,
  readDraft,
}: Options) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const editor = useInkCanvas({
    scope: `${view}:${listenIndex}:${currentQuestion.id}`,
    mounted: view === "listen" && listenPhase !== "ready" && listenPhase !== "batch_review",
    enabled: view === "listen" && (listenPhase === "active" || listenPhase === "retry"),
    count: isWordQuestion ? wordLength : 1,
    readInitial: (index) => readDraft?.(listenIndex, index) ?? [],
    getCanvas: (index) => (isWordQuestion ? wordCanvasRefs.current[index] : canvasRef.current),
  });
  return {
    readListeningInk: editor.snapshot,
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
