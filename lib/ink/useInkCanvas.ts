import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { InkStroke } from "../../features/types";
import { cloneInk, eraseInsideLasso, InkHistory, isUsableLasso } from "./ink-path";
import {
  PointerLease,
  appendSample,
  createContactMotion,
  createPaintScheduler,
  isPalmContact,
  pointerSamples,
  resumesContact,
  type ContactEnd,
} from "./gesture";
import { pointInRect, renderInk } from "./ink-render";
import { createInkBrush } from "./ink-brush";
import { countInk } from "./ink-diagnostics";

type Gesture = {
  index: number;
  pointerId: number;
  canvas: HTMLCanvasElement;
  erase: boolean;
  blocked: boolean;
  brush: ReturnType<typeof createInkBrush>;
  motion: ReturnType<typeof createContactMotion>;
  /** The committed stroke this contact continues after the pen skipped, if any. */
  rejoin: InkStroke | null;
};

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
  const gestureRef = useRef<Gesture | null>(null);
  const pointerLease = useRef(new PointerLease());
  /** The last pen lift, so a contact that resumes right away continues that stroke. */
  const lastLiftRef = useRef<{
    canvas: HTMLCanvasElement;
    stroke: InkStroke;
    end: ContactEnd;
    brush: Gesture["brush"];
  } | null>(null);

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
    // A rejoined stroke is drawn once, as the active stroke that already contains it.
    const settled =
      active && gesture?.rejoin && strokes.at(-1) === gesture.rejoin
        ? strokes.slice(0, -1)
        : strokes;
    renderInk(
      canvas,
      active && !gesture?.erase ? [...settled, active] : strokes,
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
  /** Add a finished stroke, or replace the piece it continues without a new undo step. */
  const commitStroke = (gesture: Gesture, stroke: InkStroke) => {
    const history = historiesRef.current[gesture.index];
    if (!history) return false;
    if (!gesture.rejoin || history.strokes.at(-1) !== gesture.rejoin)
      return commit(gesture.index, [...history.strokes, stroke]);
    if (!history.amend([...history.strokes.slice(0, -1), stroke])) return false;
    onChange?.(gesture.index, history.strokes);
    updateFlags();
    return true;
  };
  const changeEraser = (index: number | null) => {
    eraserRef.current = index;
    setEraserCell(index);
  };
  const cancelGesture = () => {
    const gesture = gestureRef.current;
    lastLiftRef.current = null;
    stopGesture();
    if (gesture) paint(gesture.index, gesture.canvas);
  };
  const redrawEvent = useEffectEvent((index: number, canvas: HTMLCanvasElement) => {
    const gesture = gestureRef.current;
    // Resizing cancels a selection; never accidentally erase on rotation.
    if (gesture?.canvas === canvas) {
      if (!gesture.erase && activeStrokeRef.current?.length)
        commitStroke(gesture, activeStrokeRef.current);
      stopGesture();
    }
    paint(index, canvas);
  });
  const initializeEvent = useEffectEvent(() => {
    if (scopeRef.current === scope) return;
    stopGesture();
    lastLiftRef.current = null;
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
      commitStroke(gesture, activeStrokeRef.current);
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
  const releaseOutsideCanvas = useEffectEvent((event: globalThis.PointerEvent) => {
    // Canvas handlers normally finish first. If capture failed or the canvas missed the
    // release, keep its existing samples without mapping window coordinates into the cell.
    if (gestureRef.current && pointerLease.current.owns(event.pointerId)) keepActiveStroke();
  });
  useEffect(() => {
    const interrupt = () => interruptInk();
    const release = (event: globalThis.PointerEvent) => releaseOutsideCanvas(event);
    const visibility = () => {
      if (document.hidden) interrupt();
    };
    window.addEventListener("blur", interrupt);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", interrupt);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      document.removeEventListener("visibilitychange", visibility);
      interrupt();
    };
  }, []);

  const begin = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!enabled || (event.pointerType === "mouse" && event.button !== 0) || isPalmContact(event))
      return;
    if (gestureRef.current) {
      if (event.pointerType !== "mouse") countInk("secondTouch");
      return;
    }
    event.preventDefault();
    const canvas = event.currentTarget;
    const index = Number(canvas.dataset.wordIndex ?? 0);
    if (!historiesRef.current[index]) return;
    if (!pointerLease.current.acquire(event.pointerId)) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const erase = eraserRef.current === index;
    const lift = lastLiftRef.current;
    lastLiftRef.current = null;
    const rejoin =
      !erase &&
      event.pointerType !== "mouse" &&
      lift?.canvas === canvas &&
      historiesRef.current[index].strokes.at(-1) === lift.stroke &&
      resumesContact(lift.end, x, y, event.timeStamp)
        ? lift
        : null;
    if (rejoin) countInk("rejoined");
    const gesture: Gesture = {
      index,
      pointerId: event.pointerId,
      canvas,
      erase,
      blocked: false,
      brush: rejoin?.brush ?? createInkBrush(rect.width),
      motion: createContactMotion(),
      rejoin: rejoin?.stroke ?? null,
    };
    gestureRef.current = gesture;
    gesture.motion.add(x, y, event.timeStamp);
    const firstPoint = pointInRect(rect, event.clientX, event.clientY);
    const first = erase ? firstPoint : gesture.brush(firstPoint, event);
    gestureStrokeRef.current = rejoin ? [...rejoin.stroke, first] : [first];
    activeStrokeRef.current = erase ? null : gestureStrokeRef.current;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Some touch drivers can end a contact before capture is assigned. Keep the
      // initial mark and let pointerup/cancel (including the window fallback) release it.
    }
    setNotice("");
    paint(index, canvas);
  };
  const append = (event: PointerEvent<HTMLCanvasElement>) => {
    const stroke = gestureStrokeRef.current;
    const gesture = gestureRef.current;
    if (!stroke?.length || !gesture || event.currentTarget !== gesture.canvas) return;
    const rect = gesture.canvas.getBoundingClientRect();
    for (const sample of pointerSamples(event.nativeEvent)) {
      gesture.motion.add(sample.clientX - rect.left, sample.clientY - rect.top, sample.timeStamp);
      const point = pointInRect(rect, sample.clientX, sample.clientY);
      appendSample(
        stroke,
        gesture.erase ? point : gesture.brush(point, sample),
        (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
        0.12,
      );
    }
  };
  const markPalm = (gesture: Gesture) => {
    if (!gesture.blocked) countInk("palmCut");
    gesture.blocked = true;
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || !pointerLease.current.owns(event.pointerId)) return;
    event.preventDefault();
    // Contact geometry can fluctuate on capacitive pens. Preserve accepted ink and
    // ignore suspect samples until this touch lifts; never discard the whole stroke.
    if (isPalmContact(event)) markPalm(gesture);
    if (gesture.blocked) return;
    append(event);
    scheduler.schedule(() => {
      const current = gestureRef.current;
      if (current) paint(current.index, current.canvas);
    });
  };
  const end = (event: PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || !pointerLease.current.owns(event.pointerId)) return;
    if (isPalmContact(event)) markPalm(gesture);
    if (event.type === "pointerup" && !gesture.blocked) append(event);
    if (event.type === "pointercancel") countInk("cancelled");
    const stroke = gestureStrokeRef.current;
    if (stroke?.length) {
      const history = historiesRef.current[gesture.index];
      if (gesture.erase) {
        // Pointer cancellation must leave the ink untouched.
        if (event.type === "pointerup" && !gesture.blocked) {
          const changed = commit(gesture.index, eraseInsideLasso(history.strokes, stroke));
          setNotice(
            !isUsableLasso(stroke)
              ? "請圈出一塊範圍，再放開。"
              : changed
                ? "已擦除圈內筆跡；可按復原。"
                : "圈內沒有筆跡，沒有擦除。",
          );
        }
      } else commitStroke(gesture, stroke);
    }
    stopGesture();
    // Only a pen that lifted (not a system cancel or a hand) may resume this stroke.
    const end = gesture.motion.end(event.timeStamp);
    if (
      end &&
      stroke?.length &&
      !gesture.erase &&
      !gesture.blocked &&
      event.type === "pointerup" &&
      event.pointerType !== "mouse"
    )
      lastLiftRef.current = { canvas: gesture.canvas, stroke, end, brush: gesture.brush };
    if (
      gesture.erase &&
      !gesture.blocked &&
      event.type === "pointerup" &&
      stroke &&
      isUsableLasso(stroke)
    )
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
