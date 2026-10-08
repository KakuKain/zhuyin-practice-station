import { useEffect, useRef, useState } from "react";
import type { PreviewMode } from "../types";
import { paginateLesson } from "./lesson-pagination";

export function useLessonPreview(lines: readonly string[]) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>("annotated");
  const [previewPage, setPreviewPage] = useState(0);
  const [previewColumns, setPreviewColumns] = useState(6);
  const previewColumnsRef = useRef(6);
  const previewPointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const previewWheelAtRef = useRef(0);
  const pages = paginateLesson(lines.length, previewColumns);
  const page = pages[Math.min(previewPage, pages.length - 1)];
  useEffect(() => {
    const media = window.matchMedia("(min-width: 700px)");
    const updateColumns = () => {
      const next = media.matches ? 8 : 6;
      const previous = previewColumnsRef.current;
      if (next === previous) return;
      previewColumnsRef.current = next;
      setPreviewPage((current) => {
        const previousStart = paginateLesson(lines.length, previous)[current]?.start ?? 0;
        const nextPages = paginateLesson(lines.length, next);
        return Math.max(
          0,
          nextPages.findIndex((entry) => entry.start + entry.count > previousStart),
        );
      });
      setPreviewColumns(next);
    };
    updateColumns();
    media.addEventListener("change", updateColumns);
    return () => media.removeEventListener("change", updateColumns);
  }, [lines.length]);
  return {
    previewMode,
    setPreviewMode,
    previewPage,
    setPreviewPage,
    previewColumns,
    previewPointerStartRef,
    previewWheelAtRef,
    previewPageCount: pages.length,
    previewPageStart: page.start,
    previewVisibleLines: lines.slice(page.start, page.start + page.count),
  };
}
