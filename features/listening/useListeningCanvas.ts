"use client";

import { useEffect, useRef, useState } from "react";
import type { ListenPhase, ListeningQuestion, View } from "../types";

type Options = {
  view: View;
  listenPhase: ListenPhase;
  listenIndex: number;
  currentQuestion: ListeningQuestion;
  isWordQuestion: boolean;
  wordLength: number;
};

export function useListeningCanvas(options: Options) {
  const { view, listenPhase, listenIndex, currentQuestion, isWordQuestion, wordLength } = options;
  const [wordInk, setWordInk] = useState<boolean[]>([]);

  const [isDrawing, setIsDrawing] = useState(false);

  const [hasInk, setHasInk] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const wordCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  const listeningPointerIdRef = useRef<number | null>(null);

  const listeningActiveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (view !== "listen" || (listenPhase !== "active" && listenPhase !== "retry")) return;
    const canvases = (
      currentQuestion.category === "words" ? wordCanvasRefs.current : [canvasRef.current]
    ).filter((canvas): canvas is HTMLCanvasElement => canvas !== null);
    const sizeCanvas = (canvas: HTMLCanvasElement, preserveInk: boolean) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (preserveInk && canvas.width === width && canvas.height === height) return;
      const previous = document.createElement("canvas");
      if (preserveInk) {
        previous.width = canvas.width;
        previous.height = canvas.height;
        previous.getContext("2d")?.drawImage(canvas, 0, 0);
        const pointerId = listeningPointerIdRef.current;
        const activeCanvas = listeningActiveCanvasRef.current;
        listeningPointerIdRef.current = null;
        listeningActiveCanvasRef.current = null;
        if (pointerId !== null && activeCanvas?.hasPointerCapture(pointerId))
          activeCanvas.releasePointerCapture(pointerId);
        setIsDrawing(false);
      }
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 4;
      context.strokeStyle = "#27463f";
      if (preserveInk && previous.width && previous.height)
        context.drawImage(
          previous,
          0,
          0,
          previous.width,
          previous.height,
          0,
          0,
          rect.width,
          rect.height,
        );
    };
    const resize = () => canvases.forEach((canvas) => sizeCanvas(canvas, true));
    canvases.forEach((canvas) => sizeCanvas(canvas, false));
    const observer = new ResizeObserver(resize);
    canvases.forEach((canvas) => observer.observe(canvas));
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [view, listenPhase, listenIndex, currentQuestion.category]);

  const clearCanvas = () => {
    for (const canvas of [canvasRef.current, ...wordCanvasRefs.current]) {
      const context = canvas?.getContext("2d");
      if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasInk(false);
    setWordInk([]);
  };

  const clearWordCanvas = (wordIndex: number) => {
    const canvas = wordCanvasRefs.current[wordIndex];
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    setWordInk((current) => current.map((hasInk, index) => (index === wordIndex ? false : hasInk)));
  };

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const beginDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (listenPhase !== "active" && listenPhase !== "retry") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    listeningPointerIdRef.current = event.pointerId;
    listeningActiveCanvasRef.current = event.currentTarget;
    const point = pointFromEvent(event);
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    context.beginPath();
    context.moveTo(point.x, point.y);
    if (isWordQuestion) {
      const wordIndex = Number(event.currentTarget.dataset.wordIndex);
      setWordInk((current) =>
        Array.from(
          { length: wordLength },
          (_, index) => index === wordIndex || Boolean(current[index]),
        ),
      );
    }
    setHasInk(true);
    setIsDrawing(true);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const point = pointFromEvent(event);
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasInk(true);
  };

  const endDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    listeningPointerIdRef.current = null;
    listeningActiveCanvasRef.current = null;
    setIsDrawing(false);
  };
  return {
    wordInk,
    setWordInk,
    hasInk,
    setHasInk,
    isDrawing,
    setIsDrawing,
    canvasRef,
    wordCanvasRefs,
    listeningPointerIdRef,
    listeningActiveCanvasRef,
    clearCanvas,
    clearWordCanvas,
    pointFromEvent,
    beginDrawing,
    draw,
    endDrawing,
  };
}
