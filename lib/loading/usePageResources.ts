"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import previews from "../../components/artwork-previews.json";
import type { View } from "../../features/types";

export function imageReady(image: HTMLImageElement): Promise<void> {
  if (image.complete)
    return image.naturalWidth ? Promise.resolve() : Promise.reject(new Error("image"));
  return new Promise((resolve, reject) => {
    const clear = () => {
      image.removeEventListener("load", loaded);
      image.removeEventListener("error", failed);
    };
    const loaded = () => {
      clear();
      resolve();
    };
    const failed = () => {
      clear();
      reject(new Error("image"));
    };
    image.addEventListener("load", loaded, { once: true });
    image.addEventListener("error", failed, { once: true });
  });
}

/** Wait only for teaching fonts, not an artificial minimum duration. Audio has its own readiness. */
export function usePageResources(view: View) {
  const [request, setRequest] = useState<{ label: string; id: number } | null>({
    label: "正在準備課程…",
    id: 0,
  });
  const [resourceError, setResourceError] = useState(false);
  const sequence = useRef(0);
  const previousView = useRef(view);
  const showLoading = useCallback((label: string) => {
    setResourceError(false);
    setRequest({ label, id: ++sequence.current });
  }, []);

  useLayoutEffect(() => {
    if (previousView.current === view) return;
    previousView.current = view;
    setResourceError(false);
    // Also cover direct links from results/help, which do not call the main navigation handler.
    const next = { label: "正在準備頁面…", id: ++sequence.current };
    setRequest((current) => current ?? next);
  }, [view]);

  useEffect(() => {
    let canceled = false;
    const restore: (() => void)[] = [];
    for (const element of document.querySelectorAll<HTMLElement>(
      "main, .lesson-heading, .lesson-curriculum, .listen-start-button, .journey-card",
    )) {
      const background = getComputedStyle(element).backgroundImage;
      let placeholder = background;
      const images: Promise<void>[] = [];
      for (const match of background.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        const pathname = new URL(match[1], location.href).pathname;
        const preview = (previews as Record<string, { src: string }>)[pathname];
        if (!preview) continue;
        placeholder = placeholder.replace(match[0], `url("${preview.src}")`);
        const image = new Image();
        image.src = match[1];
        images.push(image.decode());
      }
      if (!images.length) continue;
      const original = element.style.backgroundImage;
      element.style.backgroundImage = placeholder;
      const reset = () => {
        element.style.backgroundImage = original;
      };
      restore.push(reset);
      void Promise.all(images)
        .then(() => {
          if (!canceled) reset();
        })
        .catch(() => {});
    }
    return () => {
      canceled = true;
      restore.forEach((reset) => reset());
    };
  }, [view]);

  useEffect(() => {
    if (!request) return;
    let canceled = false;
    const resources: Promise<unknown>[] = [];
    if (view === "lesson" || view === "courses" || view === "fill") {
      resources.push(document.fonts.load('400 29px "KidLessonYoSans"'));
    }
    if (view === "symbols" || view === "listen" || view === "fill-practice") {
      resources.push(document.fonts.load('400 48px "KidLessonYoOnly"'));
    }
    const timeout = window.setTimeout(() => {
      if (canceled) return;
      setResourceError(true);
      setRequest(null);
    }, 15000);
    void Promise.allSettled(resources).then((results) => {
      if (canceled) return;
      window.clearTimeout(timeout);
      setResourceError(results.some((result) => result.status === "rejected"));
      setRequest(null);
    });
    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [request, view]);

  return { loadingMessage: request?.label ?? null, resourceError, showLoading };
}
