"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MapPin } from "@phosphor-icons/react";
import { InkPreview } from "../../components/AppChrome";
import type { InkStroke } from "../types";
import { createPositionHold } from "./position-hold";
import type { CSSProperties } from "react";

export type PositionMapProps = {
  lineLengths: number[];
  activeCell: number;
  strokes: Record<number, InkStroke[]>;
  pending: Record<number, InkStroke[]>;
};

/** Only lengths and the child's own ink enter this component, never answers. */
export function FillPositionMap({ lineLengths, activeCell, strokes, pending }: PositionMapProps) {
  let start = 0;
  return (
    <div className="fill-position-map" dir="rtl" aria-label="整課默寫位置">
      {lineLengths.map((length, line) => {
        const offset = start;
        start += length;
        return (
          <div className="fill-position-column" key={line}>
            <span>第 {line + 1} 行</span>
            {Array.from({ length }, (_, position) => {
              const index = offset + position;
              const ink = pending[index] ?? strokes[index] ?? [];
              return (
                <div
                  key={index}
                  className={`fill-position-cell${index === activeCell ? " is-current" : ""}${ink.length ? " has-ink" : ""}`}
                  aria-current={index === activeCell ? "location" : undefined}
                  aria-label={`第 ${line + 1} 行第 ${position + 1} 格${index === activeCell ? "，正在寫這格" : ""}`}
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

export function FillPositionPeek(props: PositionMapProps) {
  const [held, setHeld] = useState(false);
  const [hold] = useState(() => createPositionHold(setHeld));
  const [panelTop, setPanelTop] = useState(0);
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
  useLayoutEffect(() => {
    if (!held) return;
    const map = mapRef.current?.querySelector<HTMLElement>(".fill-position-map");
    const cell = map?.querySelector<HTMLElement>(".is-current");
    if (!map || !cell) return;
    // Scroll the map only: the actual writing screen and canvas never move.
    const bounds = map.getBoundingClientRect();
    const target = cell.getBoundingClientRect();
    map.scrollBy({
      left: target.left - bounds.left - (bounds.width - target.width) / 2,
      top: target.top - bounds.top - (bounds.height - target.height) / 2,
      behavior: "instant",
    });
  }, [held]);
  return (
    <div className="fill-position-peek">
      <button
        type="button"
        className="position-peek-button"
        aria-expanded={held}
        aria-controls="fill-position-overlay"
        aria-describedby="position-peek-help"
        onPointerDown={(event) => {
          if (event.button !== 0 || !hold.pointerDown(event.pointerId)) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          setPanelTop(event.currentTarget.getBoundingClientRect().bottom + 12);
        }}
        onPointerUp={(event) => hold.pointerUp(event.pointerId)}
        onPointerCancel={(event) => hold.pointerUp(event.pointerId)}
        onLostPointerCapture={(event) => hold.pointerUp(event.pointerId)}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (hold.keyDown(event.key)) {
            event.preventDefault();
            setPanelTop(event.currentTarget.getBoundingClientRect().bottom + 12);
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
      <p id="position-peek-help">亮起的是正在寫的格子，放開就繼續寫。</p>
      {held && (
        <div
          className="fill-position-overlay"
          id="fill-position-overlay"
          ref={mapRef}
          style={{ "--position-panel-top": `${panelTop}px` } as CSSProperties}
        >
          <div className="fill-position-card">
            <strong>正在寫這裡</strong>
            <p>只顯示你的筆跡，不顯示答案。</p>
            <FillPositionMap {...props} />
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
