"use client";
import { useLayoutEffect, useRef } from "react";
import type { PreviewMode } from "../types";

export function useReaderPosition(page: number, mode: PreviewMode) {
  const readerRef = useRef<HTMLDivElement>(null);
  const previous = useRef({ page, mode });
  useLayoutEffect(() => {
    const old = previous.current;
    previous.current = { page, mode };
    if (old.page === page && old.mode === mode) return;
    const reader = readerRef.current;
    reader?.focus({ preventScroll: true });
    // Keep the current page's first-line anchor after either kind of transition.
    // The mode button itself may have been above the viewport before activation.
    reader?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [page, mode]);
  return readerRef;
}
