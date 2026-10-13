import { useRef, type ReactNode } from "react";
import { ArrowUUpLeft, Trash } from "@phosphor-icons/react";
import type { InkStroke } from "../types";
import { useInkCanvas } from "../../lib/ink/useInkCanvas";
import { InkStatus, InkTools } from "../../components/InkTools";
import { InkPreview } from "../../components/AppChrome";
import { filledCells, frameCells } from "./math-round";

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

type Ink = ReturnType<typeof useInkCanvas>;

/**
 * Keeps the order circles were drawn in, so 復原 takes back the latest one in a frame, and
 * reports each cell's strokes to the round.
 */
function useFrameOrder(initial: (index: number) => InkStroke[], count: number) {
  const order = useRef<number[]>([]);
  const strokes = useRef<number[]>(
    Array.from({ length: count }, (_, index) => initial(index).length),
  );
  const track = (index: number, next: InkStroke[]) => {
    if (next.length > (strokes.current[index] ?? 0)) order.current.push(index);
    strokes.current[index] = next.length;
  };
  const undo = (ink: Ink, start: number) => {
    const inFrame = (index: number) => index >= start && index < start + frameCells;
    const at = order.current.findLastIndex((index) => inFrame(index) && ink.undoAvailable[index]);
    const cell =
      at >= 0
        ? order.current.splice(at, 1)[0]
        : Array.from({ length: frameCells }, (_, offset) => start + offset).findLast(
            (index) => ink.undoAvailable[index],
          );
    if (cell !== undefined) ink.undo(cell);
  };
  const clear = (ink: Ink, start: number) => {
    for (let index = start; index < start + frameCells; index++)
      if (ink.ink[index]) ink.clear(index);
  };
  return { track, undo, clear };
}

/**
 * 十格框: two rows of five cells, one circle in each. Every cell is its own square canvas, so a
 * circle is never stretched, and the frame shows at a glance how many there are. Filled cells
 * are numbered in reading order.
 */
function TenFrame({
  ink,
  canvases,
  start,
  cells,
  label,
  onUndo,
  onClear,
}: {
  ink: Ink;
  canvases: React.RefObject<(HTMLCanvasElement | null)[]>;
  start: number;
  cells: InkStroke[][];
  label: string;
  onUndo: () => void;
  onClear: () => void;
}) {
  const filled = filledCells(cells, start);
  const hasInk = Array.from({ length: frameCells }, (_, offset) => ink.ink[start + offset]).some(
    Boolean,
  );
  const canUndo = Array.from(
    { length: frameCells },
    (_, offset) => ink.undoAvailable[start + offset],
  ).some(Boolean);
  let number = 0;
  return (
    <div className="math-ink math-frame-ink">
      <div
        className="ink-tools is-compact math-frame-tools"
        role="group"
        aria-label={`${label}筆跡工具`}
      >
        <button
          type="button"
          className="ink-tool ink-undo"
          aria-label={`復原${label}`}
          title="復原上一個圈圈"
          disabled={!canUndo}
          onClick={onUndo}
        >
          <ArrowUUpLeft size={21} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="ink-tool ink-clear"
          aria-label={`清空${label}`}
          title="清空整個框，可復原"
          disabled={!hasInk}
          onClick={onClear}
        >
          <Trash size={19} aria-hidden="true" />
        </button>
      </div>
      <div className="math-frame" role="group" aria-label={label}>
        {Array.from({ length: frameCells }, (_, offset) => {
          const index = start + offset;
          const used = (cells[index]?.length ?? 0) > 0;
          if (used) number++;
          return (
            <div className={`math-frame-cell${used ? " is-used" : ""}`} key={offset}>
              <canvas
                ref={(element) => {
                  canvases.current[index] = element;
                }}
                data-word-index={index}
                onPointerDown={ink.begin}
                onPointerMove={ink.move}
                onPointerUp={ink.end}
                onPointerCancel={ink.end}
                onLostPointerCapture={ink.end}
                aria-label={`${label}第 ${offset + 1} 格`}
              />
              {used && (
                <span className="math-frame-number" aria-hidden="true">
                  {number}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <span className="visually-hidden" aria-live="polite">
        畫了 {filled} 個
      </span>
    </div>
  );
}

/** 畫圈圈: one 十格框 for the number shown. */
export function DrawFrame({
  scope,
  target,
  cells,
  onCell,
}: {
  scope: string;
  target: number;
  cells: InkStroke[][];
  onCell: (index: number, strokes: InkStroke[]) => void;
}) {
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const order = useFrameOrder((index) => cells[index] ?? [], frameCells);
  const ink = useInkCanvas({
    scope,
    mounted: true,
    enabled: true,
    count: frameCells,
    getCanvas: (index) => canvases.current[index] ?? null,
    readInitial: (index) => cells[index] ?? [],
    onChange: (index, strokes) => {
      order.track(index, strokes);
      onCell(index, strokes);
    },
  });
  return (
    <>
      <TenFrame
        ink={ink}
        canvases={canvases}
        start={0}
        cells={cells}
        label={`畫出 ${target} 個圈圈`}
        onUndo={() => order.undo(ink, 0)}
        onClear={() => order.clear(ink, 0)}
      />
      <InkStatus message={ink.notice} />
    </>
  );
}

const answerCell = 2 * frameCells;

/**
 * 畫圈圈算加法: a 十格框 for each number, then a square for the answer. One ink hook serves every
 * cell, so only one pen writes at a time, as in a listening word's squares. Each frame numbers
 * its own circles; counting them all together is the child's part.
 */
export function AdditionWork({
  scope,
  parts,
  cells,
  answer,
  onCell,
  onAnswer,
}: {
  scope: string;
  parts: [number, number];
  cells: InkStroke[][];
  answer: InkStroke[];
  onCell: (index: number, strokes: InkStroke[]) => void;
  onAnswer: (strokes: InkStroke[]) => void;
}) {
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const read = (index: number) => (index === answerCell ? answer : (cells[index] ?? []));
  const order = useFrameOrder(read, answerCell);
  const ink = useInkCanvas({
    scope,
    mounted: true,
    enabled: true,
    count: answerCell + 1,
    getCanvas: (index) => canvases.current[index] ?? null,
    readInitial: read,
    onChange: (index, strokes) => {
      if (index === answerCell) return onAnswer(strokes);
      order.track(index, strokes);
      onCell(index, strokes);
    },
  });
  const frame = (side: 0 | 1) => (
    <div className="math-add-side">
      <strong className="math-add-number" aria-hidden="true">
        {parts[side]}
      </strong>
      <TenFrame
        ink={ink}
        canvases={canvases}
        start={side * frameCells}
        cells={cells}
        label={`${side ? "右邊" : "左邊"}畫 ${parts[side]} 個圈圈`}
        onUndo={() => order.undo(ink, side * frameCells)}
        onClear={() => order.clear(ink, side * frameCells)}
      />
    </div>
  );
  return (
    <div className="math-add">
      <div className="math-add-grid">
        {frame(0)}
        <span className="math-sign" aria-hidden="true">
          ＋
        </span>
        {frame(1)}
        {/* ＝ stays with the answer when it moves to its own row. */}
        <div className="math-add-result">
          <span className="math-sign" aria-hidden="true">
            ＝
          </span>
          <div className="math-add-side is-answer">
            <strong className="math-add-number" aria-hidden="true">
              ？
            </strong>
            <div className="math-ink is-cell">
              <InkTools
                compact
                cellLabel="答案"
                erasing={ink.eraserCell === answerCell}
                hasInk={Boolean(ink.ink[answerCell])}
                canUndo={Boolean(ink.undoAvailable[answerCell])}
                onEraser={() => ink.toggleEraser(answerCell)}
                onUndo={() => ink.undo(answerCell)}
                onClear={() => ink.clear(answerCell)}
              />
              <div className="canvas-paper math-paper">
                <canvas
                  ref={(element) => {
                    canvases.current[answerCell] = element;
                  }}
                  data-word-index={answerCell}
                  className={ink.eraserCell === answerCell ? "is-erasing" : undefined}
                  onPointerDown={ink.begin}
                  onPointerMove={ink.move}
                  onPointerUp={ink.end}
                  onPointerCancel={ink.end}
                  onLostPointerCapture={ink.end}
                  aria-label="寫答案"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <InkStatus message={ink.notice} />
    </div>
  );
}

/** For the parent's check: the frame in miniature, each cell as it was drawn. */
export function FramePreview({ cells, start = 0 }: { cells: InkStroke[][]; start?: number }) {
  return (
    <div className="math-frame is-preview" aria-hidden="true">
      {Array.from({ length: frameCells }, (_, offset) => (
        <div className="math-frame-cell" key={offset}>
          {(cells[start + offset]?.length ?? 0) > 0 && (
            <InkPreview strokes={cells[start + offset]} />
          )}
        </div>
      ))}
    </div>
  );
}
