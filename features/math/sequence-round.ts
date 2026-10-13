/**
 * 第三課 排順序、比多少. Like 第二課, every question is a tap, checked at once and tried again
 * until right. The round walks the lesson in order: 第幾個, 數的順序, 比多少, then 比大小.
 */
import { countIcons, type CountIcon } from "./math-round";

export type SequenceQuestion =
  /** 第幾個: a row of pictures; tap the one at this place, counting from the left or right. */
  | { kind: "position"; from: "left" | "right"; place: number; icons: CountIcon[] }
  /** 數的順序: five numbers in order with one missing in the middle; tap it among the cards. */
  | { kind: "missing"; numbers: number[]; gap: number; choices: number[] }
  /** 數的順序: five numbers out of order; tap them from the smallest to the largest. */
  | { kind: "sequence"; numbers: number[] }
  /** 比多少: two rows matched one to one; tap the row with more (or fewer), or 一樣多. */
  | { kind: "rows"; ask: "more" | "less"; counts: [number, number]; icons: [CountIcon, CountIcon] }
  /** 比大小: two numbers; tap the larger (or smaller) one. */
  | { kind: "numbers"; ask: "more" | "less"; numbers: [number, number] };

export const sequenceKinds = ["position", "missing", "sequence", "rows", "numbers"] as const;
export const isSequenceQuestion = (question: { kind: string }): question is SequenceQuestion =>
  (sequenceKinds as readonly string[]).includes(question.kind);

export const sequenceRoundSize = 8;
/** In 比多少, the third choice after the two rows. */
export const sameChoice = 2;

const shuffle = <T>(items: readonly T[], random: () => number) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
const between = (random: () => number, min: number, max: number) =>
  min + Math.floor(random() * (max - min + 1));

/** Six or seven different pictures; never the first or the last, which need no counting. */
export function positionQuestion(
  from: "left" | "right",
  random = Math.random,
): Extract<SequenceQuestion, { kind: "position" }> {
  const icons = shuffle(countIcons, random).slice(0, between(random, 6, 7));
  return { kind: "position", from, place: between(random, 2, icons.length - 1), icons };
}

/**
 * Five numbers counting up or down within 1 to 10, one missing from the middle three. The
 * other cards are numbers that are not on show, so the row itself never gives them away.
 */
export function missingQuestion(
  random = Math.random,
): Extract<SequenceQuestion, { kind: "missing" }> {
  const up = random() < 0.5;
  const start = up ? between(random, 1, 6) : between(random, 5, 10);
  const numbers = Array.from({ length: 5 }, (_, step) => (up ? start + step : start - step));
  const gap = between(random, 1, 3);
  const answer = numbers[gap];
  // The two nearest numbers not on show (ties broken at random).
  const others = shuffle(
    Array.from({ length: 10 }, (_, index) => index + 1).filter((value) => !numbers.includes(value)),
    random,
  )
    .sort((a, b) => Math.abs(a - answer) - Math.abs(b - answer))
    .slice(0, 2);
  return { kind: "missing", numbers, gap, choices: shuffle([answer, ...others], random) };
}

export function sequenceQuestion(
  random = Math.random,
): Extract<SequenceQuestion, { kind: "sequence" }> {
  const numbers = shuffle(
    Array.from({ length: 10 }, (_, index) => index + 1),
    random,
  ).slice(0, 5);
  return { kind: "sequence", numbers };
}

/** Rows of 2 to 8, one to three apart, or the same when `same` is asked for. */
export function rowsQuestion(
  ask: "more" | "less",
  same: boolean,
  random = Math.random,
): Extract<SequenceQuestion, { kind: "rows" }> {
  const [top, bottom] = shuffle(countIcons, random);
  const first = between(random, 3, 8);
  const second = same
    ? first
    : first > 5
      ? first - between(random, 1, 3)
      : first + between(random, 1, 3);
  const counts = shuffle([first, second], random) as [number, number];
  return { kind: "rows", ask, counts, icons: [top, bottom] };
}

export function numbersQuestion(
  ask: "more" | "less",
  random = Math.random,
): Extract<SequenceQuestion, { kind: "numbers" }> {
  const [a, b] = shuffle(
    Array.from({ length: 10 }, (_, index) => index + 1),
    random,
  );
  return { kind: "numbers", ask, numbers: [a, b] };
}

/** One round walks the lesson in the textbook's order. 一樣多 comes up about every other round. */
export function buildSequenceRound(random = Math.random): SequenceQuestion[] {
  return [
    positionQuestion("left", random),
    positionQuestion("right", random),
    missingQuestion(random),
    sequenceQuestion(random),
    rowsQuestion("more", false, random),
    rowsQuestion("less", random() < 0.5, random),
    numbersQuestion("more", random),
    numbersQuestion("less", random),
  ];
}

/** The taps that answer a question, in order: one tap, or five for 從小到大. */
export function sequenceAnswer(question: SequenceQuestion): number[] {
  switch (question.kind) {
    case "position":
      return [
        question.from === "left" ? question.place - 1 : question.icons.length - question.place,
      ];
    case "missing":
      return [question.choices.indexOf(question.numbers[question.gap])];
    case "sequence":
      return question.numbers
        .map((value, index) => ({ value, index }))
        .sort((a, b) => a.value - b.value)
        .map((item) => item.index);
    case "rows": {
      const [top, bottom] = question.counts;
      if (top === bottom) return [sameChoice];
      return [(question.ask === "more") === top > bottom ? 0 : 1];
    }
    case "numbers": {
      const [a, b] = question.numbers;
      return [(question.ask === "more") === a > b ? 0 : 1];
    }
  }
}

/** The section a question belongs to, shown in the header. */
export function sequenceSection(question: SequenceQuestion) {
  switch (question.kind) {
    case "position":
      return "第幾個";
    case "missing":
    case "sequence":
      return "數的順序";
    case "rows":
      return "比多少";
    case "numbers":
      return "比大小";
  }
}

/** What a question practises, for the result and the parent's records. */
export function sequenceTopic(question: SequenceQuestion) {
  switch (question.kind) {
    case "position":
      return `第幾個（從${question.from === "left" ? "左" : "右"}邊數）`;
    case "missing":
      return "數的順序（中間少了哪個數）";
    case "sequence":
      return "數的順序（從小到大）";
    case "rows":
      return question.counts[0] === question.counts[1] ? "比多少（一樣多）" : "比多少";
    case "numbers":
      return question.ask === "more" ? "比大小（比較大）" : "比大小（比較小）";
  }
}

/** The instruction read aloud. */
export function sequencePromptId(question: SequenceQuestion) {
  switch (question.kind) {
    case "position":
      return `position-${question.from}-${question.place}`;
    case "missing":
      return "missing";
    case "sequence":
      return "sequence";
    case "rows":
      return `rows-${question.ask}`;
    case "numbers":
      return `numbers-${question.ask}`;
  }
}
