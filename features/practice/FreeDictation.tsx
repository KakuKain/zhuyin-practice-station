"use client";
import { useEffect, useRef, useState } from "react";
import {
  PencilSimple,
  Eraser,
  Hand,
  ArrowCounterClockwise,
  ArrowClockwise,
  Trash,
  DownloadSimple,
  GridFour,
  Square,
} from "@phosphor-icons/react";
import type { PointerEvent } from "react";

type Stroke = { color: string; erase: boolean; points: [number, number][] };
const KEY = "kid-free-dictation-v1";
export function FreeDictation() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const redo = useRef<Stroke[]>([]);
  const active = useRef<Stroke | null>(null);
  const [tool, setTool] = useState("pen");
  const [paper, setPaper] = useState("grid");
  const paperRef = useRef("grid");
  const [notice, setNotice] = useState("");
  const [counts, setCounts] = useState({ ink: 0, redo: 0 });
  const paint = () => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    ctx.clearRect(0, 0, 720, 2400);
    for (const stroke of [...strokes.current, ...(active.current ? [active.current] : [])]) {
      ctx.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.erase ? 28 : 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      stroke.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (stroke.points.length === 1) ctx.lineTo(stroke.points[0][0] + 0.1, stroke.points[0][1]);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  };
  const save = () => {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ paper: paperRef.current, strokes: strokes.current }),
      );
    } catch {
      setNotice("無法自動保存，請先儲存圖片。");
    }
    setCounts({ ink: strokes.current.length, redo: redo.current.length });
  };
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (
        data &&
        Array.isArray(data.strokes) &&
        data.strokes.every(
          (s: Stroke) =>
            typeof s.color === "string" &&
            Array.isArray(s.points) &&
            s.points.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)),
        )
      ) {
        strokes.current = data.strokes;
        paperRef.current = data.paper === "blank" ? "blank" : "grid";
        setPaper(paperRef.current);
      }
    } catch {
      /* A damaged draft should not prevent opening the board. */
    }
    setCounts({ ink: strokes.current.length, redo: 0 });
    paint();
  }, []);
  const point = (event: PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [
      ((event.clientX - rect.left) * 720) / rect.width,
      ((event.clientY - rect.top) * 2400) / rect.height,
    ];
  };
  const finish = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!active.current) return;
    strokes.current.push(active.current);
    active.current = null;
    redo.current = [];
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    save();
    paint();
  };
  const download = () => {
    const output = document.createElement("canvas");
    output.width = 720;
    output.height = 2400;
    const ctx = output.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 720, 2400);
    if (paper === "grid") {
      const step = (90 * 720) / (canvas.current?.clientWidth ?? 360);
      ctx.strokeStyle = "#b6ccd5";
      ctx.lineWidth = 1;
      for (let x = 0; x < 720; x += step)
        for (let y = 0; y < 2400; y += step) {
          ctx.setLineDash([]);
          ctx.strokeRect(x, y, step, step);
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(x + step / 2, y);
          ctx.lineTo(x + step / 2, y + step);
          ctx.moveTo(x, y + step / 2);
          ctx.lineTo(x + step, y + step / 2);
          ctx.stroke();
        }
    }
    ctx.drawImage(canvas.current!, 0, 0);
    output.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "自由聽寫.png";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    });
  };
  return (
    <section className="free-dictation" aria-label="自由聽寫畫板">
      <p>家長念題，孩子自由寫；切換紅筆即可檢查。</p>
      <div className="free-board-tools" role="group" aria-label="畫板工具">
        {(
          [
            ["pen", "畫筆", PencilSimple],
            ["red", "紅筆", PencilSimple],
            ["erase", "橡皮擦", Eraser],
            ["scroll", "捲動", Hand],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            type="button"
            key={value}
            aria-label={label}
            title={label}
            className={value === "red" ? "is-red-pen" : undefined}
            aria-pressed={tool === value}
            onClick={() => setTool(value)}
          >
            <Icon size={22} aria-hidden="true" />
          </button>
        ))}
        <button
          type="button"
          aria-label={paper === "grid" ? "改用空白底紙" : "改用田字格"}
          title={paper === "grid" ? "田字格（點一下切換空白）" : "空白（點一下切換田字格）"}
          aria-pressed={paper === "grid"}
          onClick={() => {
            const next = paper === "grid" ? "blank" : "grid";
            setPaper(next);
            paperRef.current = next;
            save();
          }}
        >
          {paper === "grid" ? (
            <GridFour size={22} aria-hidden="true" />
          ) : (
            <Square size={22} aria-hidden="true" />
          )}
        </button>
        <button
          aria-label="復原"
          title="復原"
          type="button"
          disabled={!counts.ink}
          onClick={() => {
            redo.current.push(strokes.current.pop()!);
            save();
            paint();
          }}
        >
          <ArrowCounterClockwise size={22} aria-hidden="true" />
        </button>
        <button
          aria-label="重做"
          title="重做"
          type="button"
          disabled={!counts.redo}
          onClick={() => {
            strokes.current.push(redo.current.pop()!);
            save();
            paint();
          }}
        >
          <ArrowClockwise size={22} aria-hidden="true" />
        </button>
        <button
          aria-label="清空"
          title="清空"
          type="button"
          onClick={() => {
            if (window.confirm("清空整張畫板？")) {
              strokes.current = [];
              redo.current = [];
              save();
              paint();
            }
          }}
        >
          <Trash size={22} aria-hidden="true" />
        </button>
        <button aria-label="儲存圖片" title="儲存圖片" type="button" onClick={download}>
          <DownloadSimple size={22} aria-hidden="true" />
        </button>
      </div>
      {notice && <p role="status">{notice}</p>}
      <div className={`free-board-paper ${paper === "grid" ? "has-grid" : ""}`}>
        <canvas
          ref={canvas}
          width={720}
          height={2400}
          aria-label="自由聽寫作答畫板"
          style={{ touchAction: tool === "scroll" ? "pan-y" : "none" }}
          onPointerDown={(event) => {
            if (tool === "scroll" || event.button !== 0 || active.current) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            active.current = {
              color: tool === "red" ? "#d43838" : "#193458",
              erase: tool === "erase",
              points: [point(event)],
            };
            paint();
          }}
          onPointerMove={(event) => {
            if (!active.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
            active.current.points.push(point(event));
            paint();
          }}
          onPointerUp={finish}
          onPointerCancel={finish}
        />
      </div>
      <p className="free-board-note">畫作自動保存在這個瀏覽器。往下寫時，請切換「捲動」。</p>
    </section>
  );
}
