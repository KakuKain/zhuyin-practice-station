"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { RefObject } from "react";
import type { FillFavorite, InkPoint, InkStroke, StateSetter, View } from "../types";

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

export function useFillCanvas(options: Options) {
  const {
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
  } = options;
  const [fillHasInk, setFillHasInk] = useState(false);

  const [fillIsDirty, setFillIsDirty] = useState(false);

  const fillCanvasRef = useRef<HTMLCanvasElement>(null);

  const fillDraftRef = useRef<InkStroke[]>([]);

  const fillActiveStrokeRef = useRef<InkStroke | null>(null);

  const fillPointerIdRef = useRef<number | null>(null);

  const readSavedInk = useEffectEvent((practice: boolean) =>
    practice
      ? []
      : (fillPendingCells[activeFillCell!] ??
        (fillNeedsRetry.includes(activeFillCell!) ? [] : (fillStrokes[activeFillCell!] ?? []))),
  );
  useEffect(() => {
    const isPracticeWriting =
      view === "fill-practice" && fillPracticePhase === "writing" && fillPracticeTarget !== null;
    if (!isPracticeWriting && (view !== "fill" || activeFillCell === null)) return;
    const canvas = fillCanvasRef.current;
    if (!canvas) return;
    const saved = readSavedInk(isPracticeWriting);
    let initialized = false;
    const redraw = (resetDraft: boolean) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const initialize = resetDraft || !initialized;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (!initialize && canvas.width === width && canvas.height === height) return;
      if (!initialize && fillActiveStrokeRef.current?.length) {
        fillDraftRef.current.push(fillActiveStrokeRef.current);
        fillActiveStrokeRef.current = null;
        const pointerId = fillPointerIdRef.current;
        fillPointerIdRef.current = null;
        if (pointerId !== null && canvas.hasPointerCapture(pointerId))
          canvas.releasePointerCapture(pointerId);
        setFillHasInk(true);
      }
      if (initialize) {
        fillDraftRef.current = saved.map((stroke) => stroke.map((point) => ({ ...point })));
        fillActiveStrokeRef.current = null;
        fillPointerIdRef.current = null;
        setFillHasInk(saved.length > 0);
        setFillIsDirty(false);
      }
      canvas.width = width;
      canvas.height = height;
      initialized = true;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.strokeStyle = "#17324f";
      context.fillStyle = "#17324f";
      context.lineWidth = Math.max(3, rect.width * 0.009);
      context.lineCap = "round";
      context.lineJoin = "round";
      for (const stroke of fillDraftRef.current) {
        if (!stroke.length) continue;
        context.beginPath();
        context.moveTo((stroke[0].x * rect.width) / 100, (stroke[0].y * rect.height) / 100);
        if (stroke.length === 1) {
          context.arc(
            (stroke[0].x * rect.width) / 100,
            (stroke[0].y * rect.height) / 100,
            context.lineWidth / 2,
            0,
            Math.PI * 2,
          );
          context.fill();
        } else {
          for (const point of stroke.slice(1))
            context.lineTo((point.x * rect.width) / 100, (point.y * rect.height) / 100);
          context.stroke();
        }
      }
    };
    redraw(true);
    const resize = () => redraw(false);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [view, activeFillCell, fillPracticePhase, fillPracticeTarget]);

  const fillPoint = (event: React.PointerEvent<HTMLCanvasElement>): InkPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const beginFillDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (fillPointerIdRef.current !== null) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    fillPointerIdRef.current = event.pointerId;
    setFillIsDirty(true);
    if (view === "fill" && fillParentChecked) {
      setFillParentChecked(false);
      setCompletedFillLessons((current) => current.filter((index) => index !== selectedLesson));
    }
    const point = fillPoint(event);
    fillActiveStrokeRef.current = [point];
    const context = event.currentTarget.getContext("2d");
    const rect = event.currentTarget.getBoundingClientRect();
    if (context) {
      context.beginPath();
      context.arc(
        (point.x * rect.width) / 100,
        (point.y * rect.height) / 100,
        context.lineWidth / 2,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.beginPath();
      context.moveTo((point.x * rect.width) / 100, (point.y * rect.height) / 100);
    }
  };

  const moveFillDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (fillPointerIdRef.current !== event.pointerId || !fillActiveStrokeRef.current) return;
    event.preventDefault();
    const point = fillPoint(event);
    fillActiveStrokeRef.current.push(point);
    const rect = event.currentTarget.getBoundingClientRect();
    const context = event.currentTarget.getContext("2d");
    if (context) {
      context.lineTo((point.x * rect.width) / 100, (point.y * rect.height) / 100);
      context.stroke();
    }
  };

  const endFillDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (fillPointerIdRef.current !== event.pointerId) return;
    // A quick mouse or pen flick may have no final pointermove event. Keep its
    // pointerup position so the saved miniature matches the stroke on canvas.
    if (event.type === "pointerup" && fillActiveStrokeRef.current?.length) {
      const last = fillActiveStrokeRef.current[fillActiveStrokeRef.current.length - 1];
      const point = fillPoint(event);
      if (Math.hypot(point.x - last.x, point.y - last.y) > 0.05) {
        fillActiveStrokeRef.current.push(point);
        const context = event.currentTarget.getContext("2d");
        const rect = event.currentTarget.getBoundingClientRect();
        if (context) {
          context.lineTo((point.x * rect.width) / 100, (point.y * rect.height) / 100);
          context.stroke();
        }
      }
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (fillActiveStrokeRef.current?.length) fillDraftRef.current.push(fillActiveStrokeRef.current);
    fillActiveStrokeRef.current = null;
    fillPointerIdRef.current = null;
    setFillHasInk(fillDraftRef.current.length > 0);
    if (view === "fill" && activeFillCell !== null) {
      setFillPendingCells((current) => ({
        ...current,
        [activeFillCell]: fillDraftRef.current.map((stroke) =>
          stroke.map((point) => ({ ...point })),
        ),
      }));
      persistFillRef.current();
    }
  };

  const clearFillDrawing = () => {
    const canvas = fillCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    fillDraftRef.current = [];
    if (view === "fill" && activeFillCell !== null)
      setFillPendingCells((current) => {
        const next = { ...current };
        delete next[activeFillCell];
        return next;
      });
    setFillHasInk(false);
    setFillIsDirty(true);
  };
  return {
    fillHasInk,
    setFillHasInk,
    fillIsDirty,
    setFillIsDirty,
    fillCanvasRef,
    fillDraftRef,
    fillActiveStrokeRef,
    fillPointerIdRef,
    fillPoint,
    beginFillDrawing,
    moveFillDrawing,
    endFillDrawing,
    clearFillDrawing,
  };
}
