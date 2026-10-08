import { useEffect, useRef, useState } from "react";
import { MapPin } from "@phosphor-icons/react";
import { InkPreview } from "../../components/AppChrome";
import type { InkStroke } from "../types";
import { createPositionHold } from "./position-hold";
import type { CSSProperties } from "react";

export type PositionMapProps = {
  lineLengths: number[];
  lineStarts?: number[];
  hasTitle?: boolean;
  activeCell: number;
  strokes: Record<number, InkStroke[]>;
  pending: Record<number, InkStroke[]>;
};

/** Only lengths and the child's own ink enter this component, never answers. */
export function FillPositionMap({
  lineLengths,
  lineStarts,
  hasTitle = false,
  activeCell,
  strokes,
  pending,
}: PositionMapProps) {
  return (
    <div className="fill-position-map" dir="rtl" aria-label="整課默寫位置">
      {lineLengths.map((length, line) => {
        const label = hasTitle && line === 0 ? "標題" : `第 ${line + (hasTitle ? 0 : 1)} 行`;
        const offset =
          lineStarts?.[line] ?? lineLengths.slice(0, line).reduce((sum, count) => sum + count, 0);
        return (
          <div className="fill-position-column" key={line}>
            <span>{label}</span>
            {Array.from({ length }, (_, position) => {
              const index = offset + position;
              const ink = pending[index] ?? strokes[index] ?? [];
              return (
                <div
                  key={index}
                  className={`fill-position-cell${index === activeCell ? " is-current" : ""}${ink.length ? " has-ink" : ""}`}
                  aria-current={index === activeCell ? "location" : undefined}
                  aria-label={`${label}第 ${position + 1} 格${index === activeCell ? "，正在寫這格" : ""}`}
                >
                  {ink.length > 0 && <InkPreview strokes={ink} />}
                  {index === activeCell && <span className="position-light" aria-hidden="true" />}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function FillPositionPeek({
  compact = false,
  readDraft,
  ...props
}: PositionMapProps & { compact?: boolean; readDraft?: () => InkStroke[] }) {
  const [held, setHeld] = useState(false);
  const [heldDraft, setHeldDraft] = useState<InkStroke[] | null>(null);
  const [hold] = useState(() => createPositionHold(setHeld));
  const [panelTop, setPanelTop] = useState(0);
  const [cellSize, setCellSize] = useState(40);
  const fitPanel = (button: HTMLButtonElement) => {
    const top = button.getBoundingClientRect().bottom + 8;
    const columns = props.lineLengths.length;
    const rows = Math.max(...props.lineLengths, 1);
    const width = Math.min(window.innerWidth - 24, 660) - 40;
    const height = window.innerHeight - top - 120;
    setPanelTop(top);
    setCellSize(
      Math.max(4, Math.min(56, (width - (columns - 1) * 3) / columns, (height - rows * 3) / rows)),
    );
  };
  const mapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = hold.cancel;
    const visibility = () => {
      if (document.hidden) close();
    };
    window.addEventListener("blur", close);
    window.addEventListener("resize", close);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", close);
      window.removeEventListener("resize", close);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [hold]);
  return (
    <div className={`fill-position-peek${compact ? " is-compact" : ""}`}>
      <button
        type="button"
        className="position-peek-button"
        aria-expanded={held}
        aria-controls="fill-position-overlay"
        aria-describedby="position-peek-help"
        onPointerDown={(event) => {
          if (event.button !== 0 || !hold.pointerDown(event.pointerId)) return;
          // Capture the latest ink on press, not by reading a canvas ref during render.
          setHeldDraft(
            readDraft?.().map((stroke) => stroke.map((point) => ({ ...point }))) ?? null,
          );
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          fitPanel(event.currentTarget);
        }}
        onPointerUp={(event) => hold.pointerUp(event.pointerId)}
        onPointerCancel={(event) => hold.pointerUp(event.pointerId)}
        onLostPointerCapture={(event) => hold.pointerUp(event.pointerId)}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (hold.keyDown(event.key)) {
            setHeldDraft(
              readDraft?.().map((stroke) => stroke.map((point) => ({ ...point }))) ?? null,
            );
            event.preventDefault();
            fitPanel(event.currentTarget);
          }
        }}
        onKeyUp={(event) => {
          if (hold.keyUp(event.key)) event.preventDefault();
        }}
        onBlur={hold.cancel}
      >
        <MapPin size={22} weight="duotone" aria-hidden="true" />
        按住看位置
      </button>
      <p id="position-peek-help" className={compact ? "visually-hidden" : undefined}>
        亮起的是正在寫的格子，放開就繼續寫。
      </p>
      {held && (
        <div
          className="fill-position-overlay"
          id="fill-position-overlay"
          ref={mapRef}
          style={
            {
              "--position-panel-top": `${panelTop}px`,
              "--position-cell-size": `${cellSize}px`,
            } as CSSProperties
          }
        >
          <div className="fill-position-card">
            <strong>正在寫這裡</strong>

            <FillPositionMap
              {...props}
              pending={
                heldDraft ? { ...props.pending, [props.activeCell]: heldDraft } : props.pending
              }
            />
            <span className="position-map-legend">
              <i aria-hidden="true" />
              黃色亮格：目前位置
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
