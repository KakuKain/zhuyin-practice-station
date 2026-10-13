import { useRef } from "react";
import type { InkStroke } from "../types";
import { useInkCanvas } from "../../lib/ink/useInkCanvas";
import { InkStatus, InkTools } from "../../components/InkTools";
import { InkPreview } from "../../components/AppChrome";
import type { MathQuestion } from "./math-round";

export type BondQuestion = Extract<MathQuestion, { kind: "split" | "combine" | "ways" }>;
type Place = "top" | "left" | "right";

/**
 * 第四課's 分合圖: the total on top, joined by two lines to its parts below. What the question
 * gives is printed; what the child works out is a square to write in. 分一分 leaves the second
 * part, 合一合 the total, and 分分看 both parts.
 */
const blanksOf = (question: BondQuestion): Place[] =>
  question.kind === "split" ? ["right"] : question.kind === "combine" ? ["top"] : ["left", "right"];

const givenOf = (question: BondQuestion, place: Place) =>
  place === "top"
    ? question.target
    : "parts" in question
      ? question.parts[place === "left" ? 0 : 1]
      : 0;

const placeNames: Record<Place, string> = { top: "上面", left: "左下", right: "右下" };

/** How the 分合圖 reads aloud, with ？ for each square to write in. */
export const bondLabel = (question: BondQuestion) => {
  const blanks = blanksOf(question);
  const say = (place: Place) => (blanks.includes(place) ? "？" : String(givenOf(question, place)));
  return question.kind === "combine"
    ? `${say("left")} 和 ${say("right")} 合起來是 ${say("top")}`
    : `${say("top")} 分成 ${say("left")} 和 ${say("right")}`;
};

/** The two lines from the total to its parts; the columns are node, 0.6 node, node. */
function BondLines() {
  return (
    <svg
      className="math-bond-lines"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line x1="50" y1="0" x2="19.23" y2="100" vectorEffect="non-scaling-stroke" />
      <line x1="50" y1="0" x2="80.77" y2="100" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function GivenNode({ value, place }: { value: number; place: Place }) {
  return (
    <div className={`math-bond-node is-given is-${place}`} aria-hidden="true">
      <strong>{value}</strong>
    </div>
  );
}

/**
 * The 分合圖 to write in. One ink hook serves every square, so only one pen writes at a time.
 * A single answer is kept with the question's ink; 分分看's two numbers are its work cells.
 */
export function BondWork({
  scope,
  question,
  answer,
  cells,
  onAnswer,
  onCell,
}: {
  scope: string;
  question: BondQuestion;
  answer: InkStroke[];
  cells: InkStroke[][];
  onAnswer: (strokes: InkStroke[]) => void;
  onCell: (index: number, strokes: InkStroke[]) => void;
}) {
  const blanks = blanksOf(question);
  const both = blanks.length === 2;
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const ink = useInkCanvas({
    scope,
    mounted: true,
    enabled: true,
    count: blanks.length,
    getCanvas: (index) => canvases.current[index] ?? null,
    readInitial: (index) => (both ? (cells[index] ?? []) : answer),
    onChange: (index, strokes) => (both ? onCell(index, strokes) : onAnswer(strokes)),
  });
  const node = (place: Place) => {
    const cell = blanks.indexOf(place);
    if (cell < 0) return <GivenNode value={givenOf(question, place)} place={place} />;
    const label = both ? (place === "left" ? "第一個數" : "第二個數") : "答案";
    const tools = (
      <InkTools
        compact
        cellLabel={label}
        erasing={ink.eraserCell === cell}
        hasInk={Boolean(ink.ink[cell])}
        canUndo={Boolean(ink.undoAvailable[cell])}
        onEraser={() => ink.toggleEraser(cell)}
        onUndo={() => ink.undo(cell)}
        onClear={() => ink.clear(cell)}
      />
    );
    return (
      <div className={`math-bond-node is-blank is-${place}`}>
        {/* Tools sit away from the lines: above the total, below a part. */}
        {place === "top" && tools}
        <div className="canvas-paper math-paper">
          <canvas
            ref={(element) => {
              canvases.current[cell] = element;
            }}
            data-word-index={cell}
            className={ink.eraserCell === cell ? "is-erasing" : undefined}
            onPointerDown={ink.begin}
            onPointerMove={ink.move}
            onPointerUp={ink.end}
            onPointerCancel={ink.end}
            onLostPointerCapture={ink.end}
            aria-label={`寫${label}，在${placeNames[place]}`}
          />
        </div>
        {place !== "top" && tools}
      </div>
    );
  };
  return (
    <div className="math-bond-work">
      <div
        className={`math-bond is-${question.kind}`}
        role="group"
        aria-label={`分合圖：${bondLabel(question)}`}
      >
        {node("top")}
        <BondLines />
        {node("left")}
        {node("right")}
      </div>
      <InkStatus message={ink.notice} />
    </div>
  );
}

/** For the parent's check: the 分合圖 in miniature, with what the child wrote in its squares. */
export function BondPreview({
  question,
  answer,
  cells,
}: {
  question: BondQuestion;
  answer: InkStroke[];
  cells: InkStroke[][];
}) {
  const blanks = blanksOf(question);
  const strokes = (cell: number) => (blanks.length === 2 ? (cells[cell] ?? []) : answer);
  const node = (place: Place) => {
    const cell = blanks.indexOf(place);
    if (cell < 0) return <GivenNode value={givenOf(question, place)} place={place} />;
    const written = strokes(cell);
    return (
      <div className={`math-bond-node is-blank is-${place}`}>
        <div className={`math-bond-ink${written.length ? "" : " is-empty"}`}>
          {written.length ? <InkPreview strokes={written} /> : "？"}
        </div>
      </div>
    );
  };
  return (
    <div className={`math-bond is-preview is-${question.kind}`} aria-hidden="true">
      {node("top")}
      <BondLines />
      {node("left")}
      {node("right")}
    </div>
  );
}
