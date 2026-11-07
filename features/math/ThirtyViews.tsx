import { Fragment, useRef } from "react";
import {
  Balloon,
  HandGrabbing,
  Note,
  Person,
  Plus,
  Scissors,
  type Icon,
} from "@phosphor-icons/react";
import type { InkStroke } from "../types";
import { useInkCanvas } from "../../lib/ink/useInkCanvas";
import { InkStatus, InkTools } from "../../components/InkTools";
import { InkPreview } from "../../components/AppChrome";
import { frameCells, type CountIcon, type EnoughThing, type MathQuestion } from "./math-round";
import { MathWords } from "./MathChrome";
import { Markable, icons } from "./MathPictures";

/** 第六課 30以內的數: the pictures and squares of its questions. */

type Step = Extract<MathQuestion, { kind: "step" }>;
type Fill = Extract<MathQuestion, { kind: "fill" }>;
type Queue = Extract<MathQuestion, { kind: "queue" }>;
type Larger = Extract<MathQuestion, { kind: "larger" }>;
type Enough = Extract<MathQuestion, { kind: "enough" }>;

/**
 * Things in trays of ten (two rows of five), the way the textbook packs 10 個麵包 on a plate and
 * counts on from 10. The last tray shows its empty places. `faded` pictures at the end are the
 * ones taken away.
 */
export function TrayPictures({
  count,
  icon,
  faded = 0,
  marked,
  onToggle,
}: {
  count: number;
  icon: CountIcon;
  faded?: number;
  marked?: ReadonlySet<number>;
  onToggle?: (index: number) => void;
}) {
  const { icon: Picture, color, name } = icons[icon];
  const trays = Math.max(1, Math.ceil(count / frameCells));
  return (
    <div
      className="math-trays"
      role={onToggle ? "group" : "img"}
      aria-label={onToggle ? `${name}，點一下做記號` : `${count - faded} 個${name}`}
    >
      {Array.from({ length: trays }, (_, tray) => (
        <div className="math-tray" key={tray}>
          {Array.from({ length: frameCells }, (_, slot) => {
            const index = tray * frameCells + slot;
            if (index >= count) return <span key={slot} className="math-tray-empty" />;
            if (index >= count - faded)
              return (
                <span key={slot} className="math-take-gone" aria-hidden="true">
                  <Picture size={34} weight="fill" color={color} />
                </span>
              );
            return onToggle ? (
              <Markable
                key={slot}
                picture={Picture}
                color={color}
                label={`第 ${index + 1} 個${name}`}
                marked={marked?.has(index) ?? false}
                onToggle={() => onToggle(index)}
              />
            ) : (
              <span key={slot}>
                <Picture size={34} weight="fill" color={color} aria-hidden="true" />
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** 「有 19 個」, the number the story starts from, as the textbook writes it beside the picture. */
function Given({ value, measure = "個" }: { value: number; measure?: string }) {
  return (
    <p className="math-thirty-given">
      <MathWords text="有" /> <strong>{value}</strong> <MathWords text={measure} />
    </p>
  );
}

/**
 * 多一個、少一個: the things there are, then one more coming in or one taken out (it fades from
 * its tray into the hand), as with the textbook's 彩蛋 and 蛋糕.
 */
export function StepPictures({ question }: { question: Step }) {
  const more = question.target > question.from;
  const { icon: Picture, color } = icons[question.icon];
  return (
    <div className="math-step">
      <Given value={question.from} />
      <TrayPictures count={question.from} icon={question.icon} faded={more ? 0 : 1} />
      <p className={`math-step-change ${more ? "is-more" : "is-less"}`}>
        {more ? (
          <Plus size={26} weight="bold" aria-hidden="true" />
        ) : (
          <HandGrabbing size={30} weight="duotone" aria-hidden="true" />
        )}
        <MathWords text={more ? "再多" : "拿走"} /> 1 <MathWords text="個" />
        <Picture size={34} weight="fill" color={color} aria-hidden="true" />
      </p>
    </div>
  );
}

/** One straw, standing. */
const straw = (x: number, tilt = 0) => (
  <line
    key={x}
    x1={x}
    y1="6"
    x2={x + tilt}
    y2="114"
    stroke="#5fae63"
    strokeWidth="5"
    strokeLinecap="round"
  />
);

/**
 * 10根一束: each bundle is ten straws fanned a little and tied with a band, the loose ones stand
 * on their own, as in the textbook's picture (10、20、21、22…).
 */
export function Straws({ target, small = false }: { target: number; small?: boolean }) {
  const bundles = Math.floor(target / 10);
  const loose = target % 10;
  return (
    <div
      className={`math-straws${small ? " is-small" : ""}`}
      role="img"
      aria-label={`${bundles} 束吸管和 ${loose} 根吸管`}
    >
      {Array.from({ length: bundles }, (_, index) => (
        <svg key={`b${index}`} viewBox="0 0 64 120" className="math-straw-bundle">
          {Array.from({ length: 10 }, (_, straw10) =>
            straw(9 + straw10 * 5, (straw10 - 4.5) * 1.6),
          )}
          <rect x="4" y="54" width="56" height="12" rx="5" fill="#e0567a" />
        </svg>
      ))}
      {loose > 0 && (
        <svg viewBox={`0 0 ${loose * 14 + 8} 120`} className="math-straw-loose">
          {Array.from({ length: loose }, (_, index) => straw(10 + index * 14))}
        </svg>
      )}
    </div>
  );
}

/** A number the question gives, on a washed card. */
function NumberCard({ value }: { value: number }) {
  return (
    <span className="math-number-card">
      <strong>{value}</strong>
    </span>
  );
}

/**
 * 填填看: five numbers in a row, in order up or down, with squares for the two that are missing.
 * One ink hook serves both squares, so only one pen writes at a time.
 */
export function FillWork({
  scope,
  question,
  cells,
  onCell,
}: {
  scope: string;
  question: Fill;
  cells: InkStroke[][];
  onCell: (index: number, strokes: InkStroke[]) => void;
}) {
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const ink = useInkCanvas({
    scope,
    mounted: true,
    enabled: true,
    count: 2,
    getCanvas: (index) => canvases.current[index] ?? null,
    readInitial: (index) => cells[index] ?? [],
    onChange: onCell,
  });
  return (
    <div className="math-fill">
      <div className="math-fill-row" role="group" aria-label="依順序排的五個數">
        {question.numbers.map((value, position) => {
          const cell = question.blanks.indexOf(position);
          if (cell < 0) return <NumberCard key={position} value={value} />;
          const label = cell ? "第二個空格" : "第一個空格";
          return (
            <div className="math-fill-blank" key={position}>
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
                  aria-label={`寫${label}的數`}
                />
              </div>
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
            </div>
          );
        })}
      </div>
      <InkStatus message={ink.notice} />
    </div>
  );
}

/** For the parent's check: the row with what the child wrote in each blank. */
export function FillPreview({ question, cells }: { question: Fill; cells: InkStroke[][] }) {
  return (
    <div className="math-fill-row is-preview" aria-hidden="true">
      {question.numbers.map((value, position) => {
        const cell = question.blanks.indexOf(position);
        if (cell < 0) return <NumberCard key={position} value={value} />;
        const written = cells[cell] ?? [];
        return (
          <span className={`math-bond-ink${written.length ? "" : " is-empty"}`} key={position}>
            {written.length ? <InkPreview strokes={written} /> : "？"}
          </span>
        );
      })}
    </div>
  );
}

/** Shown in a queue: the first few people, a gap for those not drawn, and the one asked about. */
const queueShown = 4;

/**
 * 排在第幾個: a queue for balloons, as in the textbook, its head on the left. 「前面排了十六個人」
 * brackets the people ahead with their number; 「他排在第二十三個」 tags the child.
 */
export function QueuePicture({ question }: { question: Queue }) {
  return (
    <div className="math-queue" role="img" aria-label="排隊拿氣球的小朋友">
      <Balloon size={56} weight="fill" color="#e0485d" aria-hidden="true" />
      <div className="math-queue-ahead">
        <span className="math-queue-bracket">
          <MathWords text="前面" />{" "}
          <strong>{question.ask === "place" ? question.given : "？"}</strong>{" "}
          <MathWords text="人" />
        </span>
        <span className="math-queue-people">
          {Array.from({ length: queueShown }, (_, index) => (
            <Fragment key={index}>
              {index === queueShown - 1 && <span className="math-queue-gap">⋯</span>}
              <Person size={52} weight="fill" color="#7d9bb6" aria-hidden="true" />
            </Fragment>
          ))}
        </span>
      </div>
      <span className="math-queue-child">
        <span className="math-queue-tag">
          <MathWords text="第" />{" "}
          <strong>{question.ask === "ahead" ? question.given : "？"}</strong>{" "}
          <MathWords text="個" />
        </span>
        <Person size={68} weight="fill" color="#e0567a" aria-hidden="true" />
      </span>
    </div>
  );
}

/** 比大小: the two numbers on cards. */
export function LargerCards({ question }: { question: Larger }) {
  return (
    <div className="math-larger" role="group" aria-label={`${question.numbers.join(" 和 ")}`}>
      <NumberCard value={question.numbers[0]} />
      <NumberCard value={question.numbers[1]} />
    </div>
  );
}

const enoughPictures: Record<
  EnoughThing,
  { icon: Icon; color: string; name: string; measure: string }
> = {
  scissors: { icon: Scissors, color: "#3d7bd9", name: "剪刀", measure: "把" },
  paper: { icon: Note, color: "#e58a2c", name: "色紙", measure: "張" },
};

/** 夠不夠: how many people and how many things, each with its picture and measure word. */
export function EnoughCards({ question }: { question: Enough }) {
  const thing = enoughPictures[question.thing];
  const row = (Picture: Icon, color: string, name: string, value: number, measure: string) => (
    <p className="math-enough-row">
      <Picture size={40} weight="fill" color={color} aria-hidden="true" />
      <MathWords text={name} />
      <strong>{value}</strong>
      <MathWords text={measure} />
    </p>
  );
  return (
    <div
      className="math-enough"
      role="img"
      aria-label={`${question.people} 個小朋友，${question.target} ${thing.measure}${thing.name}`}
    >
      {row(Person, "#e0567a", "小朋友", question.people, "人")}
      {row(thing.icon, thing.color, thing.name, question.target, thing.measure)}
    </div>
  );
}

/** 夠 and 不夠 under the square, for the child to circle one with the pen. */
export function EnoughChoices() {
  return (
    <div className="math-enough-choices" aria-hidden="true">
      <span>
        <MathWords text="夠" />
      </span>
      <span>
        <MathWords text="不夠" />
      </span>
    </div>
  );
}

/** How the parent's check names each 第六課 question, and its answer. */
export const thirtyName = (question: MathQuestion) => {
  switch (question.kind) {
    case "step":
      return question.target > question.from
        ? `${question.from} 再多 1 個`
        : `${question.from} 拿走 1 個`;
    case "bundle":
      return `${Math.floor(question.target / 10)} 束和 ${question.target % 10} 根吸管`;
    case "fill":
      return `填填看 ${question.numbers
        .map((value, position) => (question.blanks.includes(position) ? "？" : value))
        .join("、")}`;
    case "queue":
      return question.ask === "place"
        ? `前面 ${question.given} 人，排第 ？ 個`
        : `排第 ${question.given} 個，前面 ？ 人`;
    case "larger":
      return `${question.numbers.join(" 和 ")}，哪個比較${question.ask === "more" ? "大" : "小"}`;
    case "enough":
      return `${question.people} 人，${question.target} ${enoughPictures[question.thing].measure}${enoughPictures[question.thing].name}`;
    default:
      return "";
  }
};

export const thirtyAnswer = (question: MathQuestion) =>
  question.kind === "fill"
    ? question.blanks.map((position) => question.numbers[position]).join("、")
    : question.kind === "enough"
      ? question.target >= question.people
        ? "夠"
        : "不夠"
      : String(question.target);
