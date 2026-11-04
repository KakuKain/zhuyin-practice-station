import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ArrowUUpLeft, Eraser, Trash, WarningCircle, X } from "@phosphor-icons/react";
import type { InkStroke } from "../types";
import { useInkCanvas } from "../../lib/ink/useInkCanvas";
import { InkStatus, InkTools } from "../../components/InkTools";
import { InkPreview } from "../../components/AppChrome";
import { filledCells, frameCells } from "./math-round";
import { MathWords } from "./MathChrome";

/**
 * How a frame's circles (or several frames', `size` cells) compare with the number asked for,
 * counted in reading order like the numbers on the cells: the circles after the target are extra,
 * and when there are too few, the next empty cells are the missing ones.
 */
const frameMarks = (cells: InkStroke[][], start: number, target: number, size = frameCells) => {
  const extra = new Set<number>();
  const missing = new Set<number>();
  const used = (offset: number) => (cells[start + offset]?.length ?? 0) > 0;
  let count = 0;
  for (let offset = 0; offset < size; offset++)
    if (used(offset) && ++count > target) extra.add(offset);
  for (let offset = 0; offset < size && count + missing.size < target; offset++)
    if (!used(offset)) missing.add(offset);
  return { extra, missing };
};

/** The offsets of one frame among several frames' marks. */
const inFrame = (marks: Set<number>, frame: number) =>
  new Set(
    [...marks]
      .filter((offset) => Math.floor(offset / frameCells) === frame)
      .map((offset) => offset % frameCells),
  );

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
  /** The eraser takes one chosen circle away; 復原 brings it back first. */
  const erase = (ink: Ink, index: number) => {
    order.current.push(index);
    ink.clear(index);
  };
  return { track, undo, clear, erase };
}

/**
 * 十格框: two rows of five cells, one circle in each. Every cell is its own square canvas, so a
 * circle is never stretched, and the frame shows at a glance how many there are. Filled cells
 * are numbered in reading order. Circles past the target get a red box, 多畫了 shows in the tool
 * bar (so the frame never moves) and 復原 is pointed out. Too few is left for the parent's check.
 * The eraser takes away the one circle tapped next, then the pen is back. Several frames for one
 * number count on from the frame before (`numberFrom`), and `extra` is this frame's share.
 */
function TenFrame({
  ink,
  canvases,
  start,
  cells,
  extra,
  numberFrom = 0,
  label,
  onUndo,
  onClear,
  onErase,
}: {
  ink: Ink;
  canvases: React.RefObject<(HTMLCanvasElement | null)[]>;
  start: number;
  cells: InkStroke[][];
  extra: Set<number>;
  numberFrom?: number;
  label: string;
  onUndo: () => void;
  onClear: () => void;
  onErase: (index: number) => void;
}) {
  const [erasing, setErasing] = useState(false);
  const filled = filledCells(cells, start);
  const hasInk = Array.from({ length: frameCells }, (_, offset) => ink.ink[start + offset]).some(
    Boolean,
  );
  const canUndo = Array.from(
    { length: frameCells },
    (_, offset) => ink.undoAvailable[start + offset],
  ).some(Boolean);
  // Erasing: a tap on a circle takes it away; a tap on an empty cell goes back to drawing.
  const down = (index: number) => (event: PointerEvent<HTMLCanvasElement>) => {
    if (erasing) {
      setErasing(false);
      if ((cells[index]?.length ?? 0) > 0) {
        event.preventDefault();
        return onErase(index);
      }
    }
    ink.begin(event);
  };
  let number = numberFrom;
  return (
    <div className="math-ink math-frame-ink">
      <div
        className={`ink-tools is-compact math-frame-tools${extra.size ? " is-over" : ""}`}
        role="group"
        aria-label={`${label}筆跡工具`}
      >
        <span className="math-frame-over" role="status">
          {extra.size > 0 && (
            <>
              <WarningCircle size={22} weight="fill" aria-hidden="true" />
              <MathWords text="多畫了" /> {extra.size} <MathWords text="個" />
            </>
          )}
        </span>
        <button
          type="button"
          className={`ink-tool ink-eraser${erasing ? " is-active" : ""}`}
          aria-label={`擦掉一個圈圈，${label}`}
          aria-pressed={erasing}
          title={erasing ? "不擦了，繼續畫" : "點一個圈圈擦掉"}
          disabled={!hasInk && !erasing}
          onClick={() => setErasing(!erasing)}
        >
          <Eraser size={21} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`ink-tool ink-undo${extra.size ? " is-hint" : ""}`}
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
      <div
        className={`math-frame${extra.size ? " is-over" : ""}${erasing ? " is-erasing" : ""}`}
        role="group"
        aria-label={label}
      >
        {Array.from({ length: frameCells }, (_, offset) => {
          const index = start + offset;
          const used = (cells[index]?.length ?? 0) > 0;
          if (used) number++;
          return (
            <div
              className={`math-frame-cell${used ? " is-used" : ""}${extra.has(offset) ? " is-extra" : ""}`}
              key={offset}
            >
              <canvas
                ref={(element) => {
                  canvases.current[index] = element;
                }}
                data-word-index={index}
                onPointerDown={down(index)}
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
              {used && erasing && (
                <span className="math-frame-erase" aria-hidden="true">
                  <X size={16} weight="bold" />
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

/**
 * 畫圈圈: one 十格框 for the number shown, or three for a number past 10 (第六課, up to 30).
 * Three frames number their circles on from one frame to the next, and what is extra counts
 * all of them in reading order.
 */
export function DrawFrame({
  scope,
  target,
  frames = 1,
  cells,
  onCell,
}: {
  scope: string;
  target: number;
  frames?: number;
  cells: InkStroke[][];
  onCell: (index: number, strokes: InkStroke[]) => void;
}) {
  const size = frames * frameCells;
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const order = useFrameOrder((index) => cells[index] ?? [], size);
  const ink = useInkCanvas({
    scope,
    mounted: true,
    enabled: true,
    count: size,
    getCanvas: (index) => canvases.current[index] ?? null,
    readInitial: (index) => cells[index] ?? [],
    onChange: (index, strokes) => {
      order.track(index, strokes);
      onCell(index, strokes);
    },
  });
  const { extra } = frameMarks(cells, 0, target, size);
  const tenFrames = Array.from({ length: frames }, (_, frame) => (
    <TenFrame
      key={frame}
      ink={ink}
      canvases={canvases}
      start={frame * frameCells}
      cells={cells}
      extra={inFrame(extra, frame)}
      numberFrom={filledCells(cells, 0, frame * frameCells)}
      label={frames > 1 ? `畫出 ${target} 個圈圈，第 ${frame + 1} 框` : `畫出 ${target} 個圈圈`}
      onUndo={() => order.undo(ink, frame * frameCells)}
      onClear={() => order.clear(ink, frame * frameCells)}
      onErase={(index) => order.erase(ink, index)}
    />
  ));
  return (
    <>
      {/* One frame stays a direct child, where the layout places the square. */}
      {frames > 1 ? <div className="math-frames">{tenFrames}</div> : tenFrames}
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
        extra={frameMarks(cells, side * frameCells, parts[side]).extra}
        label={`${side ? "右邊" : "左邊"}畫 ${parts[side]} 個圈圈`}
        onUndo={() => order.undo(ink, side * frameCells)}
        onClear={() => order.clear(ink, side * frameCells)}
        onErase={(index) => order.erase(ink, index)}
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

/**
 * For the parent's check: the frame in miniature, each cell as it was drawn. Extra circles get a
 * red box; when there are too few, a red dashed circle shows where each missing one would go.
 * Several frames for one number are marked together, in reading order.
 */
export function FramePreview({
  cells,
  start = 0,
  target,
  frames = 1,
}: {
  cells: InkStroke[][];
  start?: number;
  target: number;
  frames?: number;
}) {
  const marks = frameMarks(cells, start, target, frames * frameCells);
  const frame = (index: number) => {
    const extra = inFrame(marks.extra, index);
    const missing = inFrame(marks.missing, index);
    const from = start + index * frameCells;
    return (
      <div
        key={index}
        className={`math-frame is-preview${extra.size ? " is-over" : ""}`}
        aria-hidden="true"
      >
        {Array.from({ length: frameCells }, (_, offset) => (
          <div
            className={`math-frame-cell${extra.has(offset) ? " is-extra" : ""}${missing.has(offset) ? " is-missing" : ""}`}
            key={offset}
          >
            {(cells[from + offset]?.length ?? 0) > 0 && (
              <InkPreview strokes={cells[from + offset]} />
            )}
          </div>
        ))}
      </div>
    );
  };
  if (frames === 1) return frame(0);
  return (
    <div className="math-frames is-preview">
      {Array.from({ length: frames }, (_, index) => frame(index))}
    </div>
  );
}
