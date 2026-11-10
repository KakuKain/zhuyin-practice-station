import { useEffect, useState } from "react";
import type { InkStroke } from "../types";
import { InkPreview } from "../../components/AppChrome";

/** The 田字格 and its 注音 strip, drawn over a cell's canvas; a punctuation cell has no strip. */
export function CellGuides({ mark }: { mark: boolean }) {
  return (
    <svg
      className="hanzi-cell-guides"
      viewBox="0 0 100 75"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {!mark && <rect x="75" y="0" width="25" height="75" className="is-strip" />}
      <path d="M 37.5 0 V 75 M 0 37.5 H 75" className="is-dashed" />
      {!mark && <path d="M 75 0 V 75" className="is-divider" />}
    </svg>
  );
}

/** The child's writing; played, it appears stroke by stroke, each numbered where it starts. */
export function InkReplay({ strokes, play }: { strokes: InkStroke[]; play: boolean }) {
  const [shown, setShown] = useState(play ? 0 : strokes.length);
  useEffect(() => {
    if (!play || shown >= strokes.length) return;
    const timer = window.setTimeout(() => setShown(shown + 1), 450);
    return () => window.clearTimeout(timer);
  }, [play, shown, strokes.length]);
  return (
    <>
      <InkPreview strokes={strokes.slice(0, shown)} />
      {play && (
        <svg className="hanzi-replay-numbers" viewBox="0 0 100 100" aria-hidden="true">
          {strokes.slice(0, shown).map((stroke, i) => (
            <text key={i} x={stroke[0].x} y={stroke[0].y}>
              {i + 1}
            </text>
          ))}
        </svg>
      )}
    </>
  );
}
