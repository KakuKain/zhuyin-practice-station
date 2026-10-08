import { useEffect, useLayoutEffect, useRef } from "react";
import type { View } from "../types";

/** Course browsing and parent comparison are the two intentional return positions. */
export function usePagePosition(view: View, pageKey: string) {
  const courseScroll = useRef(0);
  const reviewScroll = useRef(0);
  const reviewLesson = useRef("");

  useEffect(() => {
    const remember = (event: Event) => {
      if (view === "courses") courseScroll.current = window.scrollY;
      if (event.target instanceof HTMLElement && event.target.matches(".fill-compare-list")) {
        reviewScroll.current = event.target.scrollTop;
      }
    };
    window.addEventListener("scroll", remember, true);
    return () => window.removeEventListener("scroll", remember, true);
  }, [view]);

  useLayoutEffect(() => {
    window.scrollTo({ top: view === "courses" ? courseScroll.current : 0, behavior: "instant" });
    const comparison = document.querySelector<HTMLElement>(".fill-compare-list");
    const lesson = pageKey.split(":")[0];
    if (view !== "fill" || reviewLesson.current !== lesson) reviewScroll.current = 0;
    if (view === "fill") reviewLesson.current = lesson;
    if (comparison) comparison.scrollTop = reviewScroll.current;
    const writingSurface = document.querySelector<HTMLElement>(".focus-content");
    if (writingSurface) writingSurface.scrollTop = 0;
    const heading =
      (view === "courses" && courseScroll.current > 0
        ? document.querySelector<HTMLElement>(`#course-lesson-${Number(lesson) + 1} button`)
        : null) ??
      document.querySelector<HTMLElement>("main h1") ??
      document.querySelector<HTMLElement>("main .focus-question") ??
      document.querySelector<HTMLElement>("main");
    if (heading && !document.querySelector('[role="alertdialog"]')) {
      if (!heading.matches("button, a[href], input, select, textarea, [tabindex]")) {
        heading.tabIndex = -1;
      }
      heading.focus({ preventScroll: true });
    }
  }, [view, pageKey]);
}
