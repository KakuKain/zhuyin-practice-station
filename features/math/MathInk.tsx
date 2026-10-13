import { useRef, type ReactNode } from "react";
import type { InkStroke } from "../types";
import { useInkCanvas } from "../../lib/ink/useInkCanvas";
import { InkStatus, InkTools } from "../../components/InkTools";

/** One square to write or draw in, with the same pen, eraser and undo as dictation. */
export function InkSquare({
  scope,
  initial,
  onChange,
  label,
  plain = false,
  children,
}: {
  scope: string;
  initial: InkStroke[];
  onChange: (strokes: InkStroke[]) => void;
  label: string;
  plain?: boolean;
  children?: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ink = useInkCanvas({
    scope,
    mounted: true,
    enabled: true,
    count: 1,
    getCanvas: () => canvasRef.current,
    readInitial: () => initial,
    onChange: (_, strokes) => onChange(strokes),
  });
  return (
    <div className="math-ink">
      <InkTools
        erasing={ink.eraserCell === 0}
        hasInk={Boolean(ink.ink[0])}
        canUndo={Boolean(ink.undoAvailable[0])}
        onEraser={() => ink.toggleEraser(0)}
        onUndo={() => ink.undo(0)}
        onClear={() => ink.clear(0)}
      />
      <div className={`canvas-paper math-paper${plain ? " is-plain" : ""}`}>
        <canvas
          ref={canvasRef}
          className={ink.eraserCell === 0 ? "is-erasing" : undefined}
          onPointerDown={ink.begin}
          onPointerMove={ink.move}
          onPointerUp={ink.end}
          onPointerCancel={ink.end}
          onLostPointerCapture={ink.end}
          aria-label={label}
        />
        {children}
      </div>
      <InkStatus message={ink.notice} />
    </div>
  );
}

/** While drawing circles, each stroke shows its number, so a child sees how many so far. */
export function StrokeNumbers({ strokes }: { strokes: InkStroke[] }) {
  return (
    <div className="math-stroke-numbers" aria-live="polite">
      {strokes.map((stroke, index) => {
        const xs = stroke.map((point) => point.x);
        const ys = stroke.map((point) => point.y);
        const left = Math.min(98, Math.max(...xs) + 1);
        const top = Math.max(2, Math.min(...ys) - 1);
        return (
          <span key={index} style={{ left: `${left}%`, top: `${top}%` }}>
            {index + 1}
          </span>
        );
      })}
      <span className="visually-hidden">畫了 {strokes.length} 個</span>
    </div>
  );
}

const cellNames = ["左邊", "右邊", "答案"];

/**
 * 畫圈圈算加法: a square of circles for each number, then a square for the answer. One ink hook
 * serves all three, so only one pen writes at a time, as in a listening word's squares. Each
 * side numbers its own circles; counting them all together is the child's part.
 */
export function AdditionWork({
  scope,
  parts,
  circles,
  answer,
  onCircles,
  onAnswer,
}: {
  scope: string;
  parts: [number, number];
  circles: InkStroke[][];
  answer: InkStroke[];
  onCircles: (side: number, strokes: InkStroke[]) => void;
  onAnswer: (strokes: InkStroke[]) => void;
}) {
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const ink = useInkCanvas({
    scope,
    mounted: true,
    enabled: true,
    count: 3,
    getCanvas: (index) => canvases.current[index] ?? null,
    readInitial: (index) => (index < 2 ? (circles[index] ?? []) : answer),
    onChange: (index, strokes) => (index < 2 ? onCircles(index, strokes) : onAnswer(strokes)),
  });
  const cell = (index: number, label: string, children?: ReactNode) => (
    <div className={`math-ink is-cell${index === 2 ? " is-answer" : ""}`}>
      <InkTools
        compact
        cellLabel={cellNames[index]}
        erasing={ink.eraserCell === index}
        hasInk={Boolean(ink.ink[index])}
        canUndo={Boolean(ink.undoAvailable[index])}
        onEraser={() => ink.toggleEraser(index)}
        onUndo={() => ink.undo(index)}
        onClear={() => ink.clear(index)}
      />
      <div className={`canvas-paper math-paper${index < 2 ? " is-plain" : ""}`}>
        <canvas
          ref={(element) => {
            canvases.current[index] = element;
          }}
          data-word-index={index}
          className={ink.eraserCell === index ? "is-erasing" : undefined}
          onPointerDown={ink.begin}
          onPointerMove={ink.move}
          onPointerUp={ink.end}
          onPointerCancel={ink.end}
          onLostPointerCapture={ink.end}
          aria-label={label}
        />
        {children}
      </div>
    </div>
  );
  return (
    <div className="math-add">
      {/* On a phone the answer wraps below, keeping its ＝ with it. */}
      <div className="math-add-row">
        <div className="math-add-terms">
          <div className="math-add-side">
            <strong className="math-add-number" aria-hidden="true">
              {parts[0]}
            </strong>
            {cell(0, `左邊畫 ${parts[0]} 個圈圈`, <StrokeNumbers strokes={circles[0] ?? []} />)}
          </div>
          <span className="math-sign" aria-hidden="true">
            ＋
          </span>
          <div className="math-add-side">
            <strong className="math-add-number" aria-hidden="true">
              {parts[1]}
            </strong>
            {cell(1, `右邊畫 ${parts[1]} 個圈圈`, <StrokeNumbers strokes={circles[1] ?? []} />)}
          </div>
        </div>
        <div className="math-add-result">
          <span className="math-sign" aria-hidden="true">
            ＝
          </span>
          <div className="math-add-side">
            <strong className="math-add-number" aria-hidden="true">
              ？
            </strong>
            {cell(2, "寫答案")}
          </div>
        </div>
      </div>
      <InkStatus message={ink.notice} />
    </div>
  );
}
