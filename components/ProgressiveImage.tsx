"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import previews from "./artwork-previews.json";

type ArtworkProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src?: string };

export function ProgressiveImage(props: ArtworkProps) {
  // A new source gets its own loading state, including when switching lessons.
  return <ArtworkImage key={props.src} {...props} />;
}

function ArtworkImage({ src, style, loading, ...props }: ArtworkProps) {
  const preview = src
    ? (previews as Record<string, { src: string; width: number; height: number }>)[src]
    : undefined;
  const [ready, setReady] = useState(!preview);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!preview || !src) return;
    let canceled = false;
    const load = () => {
      const image = new Image();
      image.src = src;
      void image
        .decode()
        .then(() => {
          if (!canceled) setReady(true);
        })
        .catch(() => {
          /* Keep the preview when offline. */
        });
    };
    let observer: IntersectionObserver | undefined;
    if (loading === "lazy" && ref.current) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer?.disconnect();
            load();
          }
        },
        { rootMargin: "200px" },
      );
      observer.observe(ref.current);
    } else load();
    return () => {
      canceled = true;
      observer?.disconnect();
    };
  }, [src, preview, loading]);
  return (
    <img
      {...props}
      alt={props.alt ?? ""}
      ref={ref}
      src={ready ? src : preview?.src}
      loading={loading}
      width={props.width ?? preview?.width}
      height={props.height ?? preview?.height}
      style={{
        transition: "filter 200ms ease",
        ...style,
        ...(preview && !ready ? { filter: "blur(3px)" } : {}),
      }}
    />
  );
}
