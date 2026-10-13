import type { CSSProperties } from "react";
import { MathWords } from "./MathChrome";
import { icons } from "./MathPictures";
import { sameChoice, sequenceAnswer, type SequenceQuestion } from "./sequence-round";

export type Feedback = { kind: "correct" | "retry"; pick: number } | null;

/** How a choice looks: just tapped right or wrong, or already taken in 從小到大. */
export const choiceState = (index: number, picks: number[], feedback: Feedback) =>
  feedback?.pick === index
    ? ` is-${feedback.kind === "correct" ? "correct" : "wrong"}`
    : picks.includes(index)
      ? " is-picked"
      : "";

type StageProps<Kind extends SequenceQuestion["kind"]> = {
  question: Extract<SequenceQuestion, { kind: Kind }>;
  picks: number[];
  feedback: Feedback;
  onPick: (index: number) => void;
};

/** 第三課 排順序、比多少: the picture or cards to tap for each kind of question. */
export function SequenceStage(props: StageProps<SequenceQuestion["kind"]>) {
  const { question } = props;
  switch (question.kind) {
    case "position":
      return <PositionRow {...props} question={question} />;
    case "missing":
      return <MissingNumber {...props} question={question} />;
    case "sequence":
      return <SortNumbers {...props} question={question} />;
    case "rows":
      return <MatchedRows {...props} question={question} />;
    case "numbers":
      return <TwoNumbers {...props} question={question} />;
  }
}

/** 第幾個: a row of different pictures; the side to count from is marked at its end. */
function PositionRow({ question, picks, feedback, onPick }: StageProps<"position">) {
  return (
    <div className={`sequence-row is-from-${question.from}`}>
      <div
        className="sequence-items"
        style={{ "--count": question.icons.length } as CSSProperties}
        role="group"
        aria-label="一排圖片"
      >
        {question.icons.map((icon, index) => {
          const { icon: Picture, color, name } = icons[icon];
          return (
            <button
              type="button"
              key={icon}
              className={`sequence-item${choiceState(index, picks, feedback)}`}
              aria-label={`從左邊數第 ${index + 1} 個，${name}`}
              onClick={() => onPick(index)}
            >
              <Picture weight="fill" color={color} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <div className="sequence-ends" aria-hidden="true">
        <span className={question.from === "left" ? "is-start" : undefined}>
          <MathWords text="左邊" />
        </span>
        <span className={question.from === "right" ? "is-start" : undefined}>
          <MathWords text="右邊" />
        </span>
      </div>
    </div>
  );
}

/** 數的順序: five numbers in order with a gap, and three cards to fill it. */
function MissingNumber({ question, picks, feedback, onPick }: StageProps<"missing">) {
  const answer = question.numbers[question.gap];
  return (
    <div className="sequence-missing">
      <div
        className="sequence-numbers"
        role="img"
        aria-label={question.numbers
          .map((value, index) => (index === question.gap ? "？" : value))
          .join("、")}
      >
        {question.numbers.map((value, index) =>
          index === question.gap ? (
            <span
              key={index}
              className={`sequence-card is-gap${feedback?.kind === "correct" ? " is-filled" : ""}`}
            >
              {feedback?.kind === "correct" ? answer : "？"}
            </span>
          ) : (
            <span key={index} className="sequence-card">
              {value}
            </span>
          ),
        )}
      </div>
      <div className="sequence-choices" role="group" aria-label="選一個數">
        {question.choices.map((value, index) => (
          <button
            type="button"
            key={value}
            className={`sequence-card is-choice${choiceState(index, picks, feedback)}`}
            onClick={() => onPick(index)}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 從小到大: tap the numbers in order; each tap takes its place in the row below. */
function SortNumbers({ question, picks, feedback, onPick }: StageProps<"sequence">) {
  const sorted = sequenceAnswer(question).map((index) => question.numbers[index]);
  return (
    <div className="sequence-sort">
      <div className="sequence-choices" role="group" aria-label="數字卡">
        {question.numbers.map((value, index) => {
          const order = picks.indexOf(index);
          return (
            <button
              type="button"
              key={value}
              className={`sequence-card is-choice${choiceState(index, picks, feedback)}`}
              onClick={() => onPick(index)}
            >
              {value}
              {order >= 0 && (
                <span className="compare-pick-number" aria-hidden="true">
                  {order + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* Shows the taps in order; the cards already say which were taken. */}
      <div className="sequence-numbers is-tray" aria-hidden="true">
        {sorted.map((value, place) => (
          <span key={place} className={`sequence-card${place < picks.length ? "" : " is-gap"}`}>
            {place < picks.length ? value : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * 比多少: two rows matched one to one in the same columns, so the extra ones stick out. Tap a
 * row, or 一樣多.
 */
function MatchedRows({ question, picks, feedback, onPick }: StageProps<"rows">) {
  const columns = Math.max(...question.counts);
  return (
    <div className="sequence-rows" style={{ "--columns": columns } as CSSProperties}>
      {question.counts.map((count, row) => {
        const { icon: Picture, color, name } = icons[question.icons[row]];
        return (
          <button
            type="button"
            key={row}
            className={`sequence-matched${choiceState(row, picks, feedback)}`}
            aria-label={`${row ? "下面" : "上面"}這排${name}`}
            onClick={() => onPick(row)}
          >
            {Array.from({ length: count }, (_, index) => (
              <Picture key={index} weight="fill" color={color} aria-hidden="true" />
            ))}
          </button>
        );
      })}
      <button
        type="button"
        className={`sequence-same${choiceState(sameChoice, picks, feedback)}`}
        onClick={() => onPick(sameChoice)}
      >
        <MathWords text="一樣多" />
      </button>
    </div>
  );
}

/** 比大小: two numbers side by side. */
function TwoNumbers({ question, picks, feedback, onPick }: StageProps<"numbers">) {
  return (
    <div className="sequence-choices is-pair" role="group" aria-label="兩個數">
      {question.numbers.map((value, index) => (
        <button
          type="button"
          key={value}
          className={`sequence-card is-choice is-big${choiceState(index, picks, feedback)}`}
          onClick={() => onPick(index)}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
