import { useEffect, useEffectEvent, useRef, useState } from "react";
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
import {
  PointerLease,
  appendSample,
  createContactMotion,
  createPaintScheduler,
  isPalmContact,
  pointerSamples,
  resumesContact,
  type ContactEnd,
} from "../../lib/ink/gesture";
import { countInk } from "../../lib/ink/ink-diagnostics";
import {
  freeBoardKey,
  boardStep,
  boardHeight,
  readBoardDraft,
  paintBoard,
  type BoardStroke,
} from "../../lib/ink/free-board";

export function FreeDictation() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<BoardStroke[]>([]);
  const redo = useRef<BoardStroke[]>([]);
  const active = useRef<BoardStroke | null>(null);
  const pointerLease = useRef(new PointerLease());
  const motion = useRef(createContactMotion());
  /** The last pen lift, so a contact that resumes right away continues that stroke. */
  const lastLift = useRef<{ stroke: BoardStroke; end: ContactEnd } | null>(null);
  /** The stroke as it was before this contact continued it, kept if the contact is a hand. */
  const resumed = useRef<BoardStroke | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const size = useRef({ width: 304, height: boardHeight });
  const [boardSize, setBoardSize] = useState({ width: 304, height: boardHeight });
  const [protectedDraft, setProtectedDraft] = useState(false);
  const protectedRef = useRef(false);
  const [tool, setTool] = useState("pen");
  const [paper, setPaper] = useState("grid");
  const paperRef = useRef("grid");
  const [notice, setNotice] = useState("");
  const [counts, setCounts] = useState({ ink: 0, redo: 0 });
  // Points of the active stroke already on the canvas; the rest are drawn on the next frame.
  const drawnPoints = useRef(0);
  /** Full redraw: on load, resize, undo/redo/clear and once when a stroke ends. */
  const paint = () => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const width = Math.round(size.current.width * ratio);
    const height = Math.round(size.current.height * ratio);
    // Assigning a size reallocates the bitmap, so only do it when the size changes.
    if (el.width !== width) el.width = width;
    if (el.height !== height) el.height = height;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, size.current.width, size.current.height);
    paintBoard(ctx, [...strokes.current, ...(active.current ? [active.current] : [])]);
    drawnPoints.current = active.current?.points.length ?? 0;
  };
  /** While writing, draw only the new segments instead of repainting a full page of ink. */
  const paintActive = () => {
    const stroke = active.current;
    const ctx = canvas.current?.getContext("2d");
    if (!stroke || !ctx) return;
    const from = Math.max(0, drawnPoints.current - 1);
    if (from + 1 >= stroke.points.length && drawnPoints.current) return;
    paintBoard(ctx, [{ ...stroke, points: stroke.points.slice(from) }]);
    drawnPoints.current = stroke.points.length;
  };
  const [scheduler] = useState(() => createPaintScheduler());
  const pendingSave = useRef<number | null>(null);
  const writeBoard = () => {
    if (pendingSave.current !== null) window.clearTimeout(pendingSave.current);
    pendingSave.current = null;
    if (protectedRef.current) return;
    try {
      localStorage.setItem(
        freeBoardKey,
        JSON.stringify({
          version: 2,
          ...size.current,
          paper: paperRef.current,
          strokes: strokes.current,
        }),
      );
    } catch {
      setNotice("無法自動保存，請先儲存圖片。");
    }
  };
  /** Serializing a full page on every lift stalls the next stroke; write once the hand rests. */
  const save = () => {
    setCounts({ ink: strokes.current.length, redo: redo.current.length });
    if (pendingSave.current !== null) window.clearTimeout(pendingSave.current);
    pendingSave.current = window.setTimeout(writeBoard, 600);
  };
  const paintLatest = useEffectEvent(() => paint());
  useEffect(() => {
    const width = Math.max(
      boardStep,
      Math.floor((viewport.current?.clientWidth ?? 304) / boardStep) * boardStep,
    );
    size.current = { width, height: boardHeight };
    try {
      const raw = localStorage.getItem(freeBoardKey);
      if (raw) {
        const data = readBoardDraft(JSON.parse(raw), width);
        if (!data) throw new Error("invalid draft");
        strokes.current = data.strokes;
        size.current = { width: data.width, height: data.height };
        paperRef.current = data.paper;
        setPaper(data.paper);
      }
    } catch {
      protectedRef.current = true;
      setProtectedDraft(true);
      setNotice("舊畫作無法讀取，已保留原始資料。可到「更多 → 裝置備份」先下載備份。");
    }
    setBoardSize(size.current);
    setCounts({ ink: strokes.current.length, redo: 0 });
    paintLatest();
    const observer = new ResizeObserver(() => paintLatest());
    if (viewport.current) observer.observe(viewport.current);
    if (canvas.current) observer.observe(canvas.current);
    return () => {
      observer.disconnect();
      scheduler.cancel();
    };
  }, [scheduler]);
  // 0.1 px keeps the stroke exact while halving the stored size of a full page.
  const round = (value: number) => Math.round(value * 10) / 10;
  const point = (rect: DOMRect, clientX: number, clientY: number): [number, number] => [
    round(Math.max(0, Math.min(size.current.width, clientX - rect.left))),
    round(Math.max(0, Math.min(size.current.height, clientY - rect.top))),
  ];
  const sample = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!active.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    for (const item of pointerSamples(event.nativeEvent)) {
      const next = point(rect, item.clientX, item.clientY);
      motion.current.add(next[0], next[1], item.timeStamp);
      appendSample(active.current.points, next, (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]), 1);
    }
  };
  const stopStroke = (completed = false) => {
    const stroke = active.current;
    lastLift.current = null;
    const pointerId = pointerLease.current.release();
    active.current = null;
    scheduler.cancel();
    // Preserve interrupted writing; an interrupted eraser must not remove ink.
    if (stroke && (!stroke.erase || completed)) {
      strokes.current.push(stroke);
      redo.current = [];
    }
    const el = canvas.current;
    if (el && pointerId !== null && el.hasPointerCapture(pointerId))
      el.releasePointerCapture(pointerId);
    if (stroke) {
      save();
      paint();
    }
  };
  const finish = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!pointerLease.current.owns(event.pointerId)) return;
    if (event.type === "pointerup" && active.current) sample(event);
    if (event.type === "pointercancel") countInk("cancelled");
    const stroke = active.current;
    const end = motion.current.end(event.timeStamp);
    stopStroke(event.type === "pointerup");
    // Only a pen that lifted (not a system cancel) may resume this stroke.
    if (
      stroke &&
      end &&
      !stroke.erase &&
      event.type === "pointerup" &&
      event.pointerType !== "mouse" &&
      strokes.current.at(-1) === stroke
    )
      lastLift.current = { stroke, end };
  };
  const interruptStroke = useEffectEvent(() => stopStroke());
  const flushSave = useEffectEvent(() => {
    if (pendingSave.current !== null) writeBoard();
  });
  useEffect(() => {
    const interrupt = () => interruptStroke();
    const visibility = () => {
      if (!document.hidden) return;
      interrupt();
      flushSave();
    };
    const leave = () => flushSave();
    window.addEventListener("blur", interrupt);
    window.addEventListener("pagehide", leave);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      interrupt();
      flushSave();
      window.removeEventListener("blur", interrupt);
      window.removeEventListener("pagehide", leave);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  const download = () => {
    stopStroke();
    const output = document.createElement("canvas");
    const ratio = 2;
    output.width = size.current.width * ratio;
    output.height = size.current.height * ratio;
    const ctx = output.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, size.current.width, size.current.height);
    if (paper === "grid") {
      for (let x = 0; x < size.current.width; x += boardStep)
        for (let y = 0; y < size.current.height; y += boardStep) {
          ctx.setLineDash([]);
          ctx.strokeStyle = "#97b3c2";
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, 138, 138);
          ctx.strokeStyle = "#ccdbe4";
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(x + 70, y + 2);
          ctx.lineTo(x + 70, y + 138);
          ctx.moveTo(x + 2, y + 70);
          ctx.lineTo(x + 138, y + 70);
          ctx.stroke();
        }
    }
    ctx.setLineDash([]);
    ctx.drawImage(canvas.current!, 0, 0, size.current.width, size.current.height);
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
            onClick={() => {
              stopStroke();
              setTool(value);
            }}
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
            stopStroke();
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
            stopStroke();
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
            stopStroke();
            if (!redo.current.length) return;
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
            if (!protectedDraft && window.confirm("清空整張畫板？")) {
              stopStroke();
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
      <div ref={viewport} className="free-board-viewport">
        <div
          style={{ width: boardSize.width }}
          className={`free-board-paper ${paper === "grid" ? "has-grid" : ""}`}
        >
          <canvas
            ref={canvas}
            width={boardSize.width}
            height={boardSize.height}
            aria-label="自由聽寫作答畫板"
            style={{
              width: boardSize.width,
              height: boardSize.height,
              touchAction: tool === "scroll" ? "auto" : "none",
            }}
            onPointerDown={(event) => {
              if (
                protectedDraft ||
                tool === "scroll" ||
                (event.pointerType === "mouse" && event.button !== 0) ||
                strokes.current.length >= 2000 ||
                isPalmContact(event)
              )
                return;
              event.preventDefault();
              if (!pointerLease.current.acquire(event.pointerId)) {
                if (event.pointerType !== "mouse") countInk("secondTouch");
                return;
              }
              event.currentTarget.setPointerCapture(event.pointerId);
              const first = point(
                event.currentTarget.getBoundingClientRect(),
                event.clientX,
                event.clientY,
              );
              const color = tool === "red" ? "#d43838" : "#193458";
              const erase = tool === "erase";
              const lift = lastLift.current;
              lastLift.current = null;
              motion.current = createContactMotion();
              motion.current.add(first[0], first[1], event.timeStamp);
              if (
                lift &&
                !erase &&
                event.pointerType !== "mouse" &&
                lift.stroke.color === color &&
                strokes.current.at(-1) === lift.stroke &&
                resumesContact(lift.end, first[0], first[1], event.timeStamp)
              ) {
                // The pen skipped: continue the stroke already on the page.
                countInk("rejoined");
                strokes.current.pop();
                resumed.current = { ...lift.stroke, points: [...lift.stroke.points] };
                active.current = lift.stroke;
                drawnPoints.current = lift.stroke.points.length;
                appendSample(
                  lift.stroke.points,
                  first,
                  (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]),
                  1,
                );
              } else {
                resumed.current = null;
                active.current = { color, erase, points: [first] };
                drawnPoints.current = 0;
              }
              paintActive();
            }}
            onPointerMove={(event) => {
              if (!active.current || !pointerLease.current.owns(event.pointerId)) return;
              event.preventDefault();
              if (isPalmContact(event)) {
                countInk("palmCut");
                // A resting hand that spread out: drop it without keeping any ink.
                active.current = null;
                if (resumed.current) strokes.current.push(resumed.current);
                resumed.current = null;
                const pointerId = pointerLease.current.release();
                if (pointerId !== null && event.currentTarget.hasPointerCapture(pointerId))
                  event.currentTarget.releasePointerCapture(pointerId);
                scheduler.cancel();
                paint();
                return;
              }
              sample(event);
              scheduler.schedule(paintActive);
            }}
            onPointerUp={finish}
            onPointerCancel={finish}
            onLostPointerCapture={finish}
          />
        </div>
      </div>
      <p className="free-board-note">畫作自動保存在這個瀏覽器。往下寫時，請切換「捲動」。</p>
    </section>
  );
}
