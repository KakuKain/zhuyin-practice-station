import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { InkStroke } from "../../features/types";
import { cloneInk, eraseInsideLasso, InkHistory, isUsableLasso } from "./ink-path";
import {
  PointerLease,
  appendSample,
  createPaintScheduler,
  isPalmContact,
  pointerSamples,
} from "./gesture";
import { pointInRect, pointerPoint, renderInk } from "./ink-render";

type Options = {
  scope: string;
  mounted: boolean;
  enabled: boolean;
  count: number;
  getCanvas: (index: number) => HTMLCanvasElement | null;
  readInitial?: (index: number) => InkStroke[];
  onChange?: (index: number, strokes: InkStroke[]) => void;
};

export function useInkCanvas({
  scope,
  mounted,
  enabled,
  count,
  getCanvas,
  readInitial,
  onChange,
}: Options) {
  const [ink, setInk] = useState<boolean[]>([]);
  const [undoAvailable, setUndoAvailable] = useState<boolean[]>([]);
  const [eraserCell, setEraserCell] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const historiesRef = useRef<InkHistory[]>([]);
  const scopeRef = useRef<string | null>(null);
  const eraserRef = useRef<number | null>(null);
  const activeStrokeRef = useRef<InkStroke | null>(null);
  const gestureStrokeRef = useRef<InkStroke | null>(null);
  const gestureRef = useRef<{
    index: number;
    pointerId: number;
    canvas: HTMLCanvasElement;
    erase: boolean;
  } | null>(null);
  const pointerLease = useRef(new PointerLease());

  const readInitialEvent = useEffectEvent((index: number) => readInitial?.(index) ?? []);
  const getCanvasEvent = useEffectEvent((index: number) => getCanvas(index));

  const updateFlags = () => {
    setInk(historiesRef.current.map((history) => history.strokes.length > 0));
    setUndoAvailable(historiesRef.current.map((history) => history.canUndo));
  };
  const paint = (index: number, canvas = getCanvas(index)) => {
    if (!canvas) return;
    const gesture = gestureRef.current;
    const active = gesture?.index === index ? gestureStrokeRef.current : null;
    const strokes = historiesRef.current[index]?.strokes ?? [];
    renderInk(
      canvas,
      active && !gesture?.erase ? [...strokes, active] : strokes,
      active && gesture?.erase ? active : undefined,
    );
  };
  const [scheduler] = useState(() => createPaintScheduler());
  const stopGesture = () => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    pointerLease.current.release();
    activeStrokeRef.current = null;
    gestureStrokeRef.current = null;
    scheduler.cancel();
    if (gesture && gesture.canvas.hasPointerCapture(gesture.pointerId))
      gesture.canvas.releasePointerCapture(gesture.pointerId);
  };
  const commit = (index: number, strokes: InkStroke[]) => {
    const history = historiesRef.current[index];
    if (!history?.commit(strokes)) return false;
    onChange?.(index, history.strokes);
    updateFlags();
    return true;
  };
  const changeEraser = (index: number | null) => {
    eraserRef.current = index;
    setEraserCell(index);
  };
  const cancelGesture = () => {
    const gesture = gestureRef.current;
    stopGesture();
    if (gesture) paint(gesture.index, gesture.canvas);
  };
  const redrawEvent = useEffectEvent((index: number, canvas: HTMLCanvasElement) => {
    const gesture = gestureRef.current;
    // Resizing cancels a selection; never accidentally erase on rotation.
    if (gesture?.canvas === canvas) {
      if (!gesture.erase && activeStrokeRef.current?.length)
        commit(index, [...historiesRef.current[index].strokes, activeStrokeRef.current]);
      stopGesture();
    }
    paint(index, canvas);
  });
  const initializeEvent = useEffectEvent(() => {
    if (scopeRef.current === scope) return;
    stopGesture();
    historiesRef.current = Array.from(
      { length: count },
      (_, index) => new InkHistory(cloneInk(readInitialEvent(index))),
    );
    scopeRef.current = scope;
    changeEraser(null);
    setNotice("");
    updateFlags();
  });

  useEffect(() => {
    initializeEvent();
    if (!mounted) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const canvas = entry.target as HTMLCanvasElement;
        const index = Number(canvas.dataset.wordIndex ?? 0);
        redrawEvent(index, canvas);
      }
    });
    for (let index = 0; index < count; index++) {
      const canvas = getCanvasEvent(index);
      if (!canvas) continue;
      redrawEvent(index, canvas);
      observer.observe(canvas);
    }
    return () => {
      observer.disconnect();
    };
  }, [scope, mounted, count]);

  /** Keep the writing so far; an unfinished lasso never erases anything. */
  const keepActiveStroke = () => {
    const gesture = gestureRef.current;
    if (gesture && !gesture.erase && activeStrokeRef.current?.length)
      commit(gesture.index, [
        ...historiesRef.current[gesture.index].strokes,
        activeStrokeRef.current,
      ]);
    cancelGesture();
  };
  const lockEvent = useEffectEvent(() => {
    if (enabled) return;
    keepActiveStroke();
    changeEraser(null);
    setNotice("");
  });
  useEffect(() => {
    if (!enabled) queueMicrotask(() => lockEvent());
  }, [enabled]);
  useEffect(
    () => () => {
      scheduler.cancel();
    },
    [scheduler],
  );

  // Switching apps or a system dialog keeps the stroke, as rotation and locking do.
  const interruptInk = useEffectEvent(() => keepActiveStroke());
  useEffect(() => {
    const interrupt = () => interruptInk();
    const visibility = () => {
      if (document.hidden) interrupt();
    };
    window.addEventListener("blur", interrupt);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", interrupt);
      document.removeEventListener("visibilitychange", visibility);
      interrupt();
    };
  }, []);

  const begin = (event: PointerEvent<HTMLCanvasElement>) => {
    if (
      !enabled ||
      gestureRef.current ||
      (event.pointerType === "mouse" && event.button !== 0) ||
      isPalmContact(event)
    )
      return;
    event.preventDefault();
    const canvas = event.currentTarget;
    const index = Number(canvas.dataset.wordIndex ?? 0);
    if (!historiesRef.current[index]) return;
    if (!pointerLease.current.acquire(event.pointerId)) return;
    canvas.setPointerCapture(event.pointerId);
    gestureRef.current = {
      index,
      pointerId: event.pointerId,
      canvas,
      erase: eraserRef.current === index,
    };
    gestureStrokeRef.current = [pointerPoint(canvas, event.clientX, event.clientY)];
    activeStrokeRef.current = gestureRef.current.erase ? null : gestureStrokeRef.current;
    setNotice("");
    paint(index, canvas);
  };
  const append = (event: PointerEvent<HTMLCanvasElement>) => {
    const stroke = gestureStrokeRef.current;
    if (!stroke?.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    for (const sample of pointerSamples(event.nativeEvent))
      appendSample(
        stroke,
        pointInRect(rect, sample.clientX, sample.clientY),
        (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
        0.12,
      );
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || !pointerLease.current.owns(event.pointerId)) return;
    event.preventDefault();
    // A resting hand can start small and spread; drop that touch instead of drawing it.
    if (isPalmContact(event)) {
      cancelGesture();
      return;
    }
    append(event);
    scheduler.schedule(() => {
      const current = gestureRef.current;
      if (current) paint(current.index, current.canvas);
    });
  };
  const end = (event: PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || !pointerLease.current.owns(event.pointerId)) return;
    if (event.type === "pointerup") append(event);
    const stroke = gestureStrokeRef.current;
    if (stroke?.length) {
      const history = historiesRef.current[gesture.index];
      if (gesture.erase) {
        // Pointer cancellation must leave the ink untouched.
        if (event.type === "pointerup") {
          const changed = commit(gesture.index, eraseInsideLasso(history.strokes, stroke));
          setNotice(
            !isUsableLasso(stroke)
              ? "請圈出一塊範圍，再放開。"
              : changed
                ? "已擦除圈內筆跡；可按復原。"
                : "圈內沒有筆跡，沒有擦除。",
          );
        }
      } else commit(gesture.index, [...history.strokes, stroke]);
    }
    stopGesture();
    if (gesture.erase && event.type === "pointerup" && stroke && isUsableLasso(stroke))
      changeEraser(null);
    paint(gesture.index, gesture.canvas);
  };
  const toggleEraser = (index = 0) => {
    if (!enabled) return;
    cancelGesture();
    changeEraser(eraserRef.current === index ? null : index);
    setNotice("");
  };
  const clear = (index = 0) => {
    if (!enabled) return;
    cancelGesture();
    const history = historiesRef.current[index];
    if (history?.strokes.length) commit(index, []);
    changeEraser(null);
    setNotice("已清空這格；可按復原。");
    paint(index);
  };
  const undo = (index = 0) => {
    if (!enabled) return;
    cancelGesture();
    const history = historiesRef.current[index];
    if (!history?.undo()) return;
    onChange?.(index, history.strokes);
    updateFlags();
    changeEraser(null);
    setNotice("已復原，可以繼續寫。");
    paint(index);
  };
  const reset = () => {
    cancelGesture();
    historiesRef.current = Array.from({ length: count }, () => new InkHistory());
    changeEraser(null);
    setNotice("");
    updateFlags();
    for (let index = 0; index < count; index++) paint(index);
  };
  return {
    ink,
    undoAvailable,
    eraserCell,
    notice,
    activeStrokeRef,
    begin,
    move,
    end,
    toggleEraser,
    clear,
    undo,
    reset,
    snapshot: () => historiesRef.current.map((history) => cloneInk(history.strokes)),
  };
}
