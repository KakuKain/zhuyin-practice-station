import type { InkStroke } from "../types";
import { childKey } from "../../lib/storage/child-profiles";
import { mathRoundStorageKey, storageKeys } from "../../lib/storage/storage-keys";

/** Things a child counts: each picture is one whole object, never a pair or a bunch. */
export const countIcons = [
  "fish",
  "bird",
  "tulip",
  "star",
  "heart",
  "car",
  "iceCream",
  "carrot",
  "balloon",
  "butterfly",
  "acorn",
  "leaf",
] as const;
export type CountIcon = (typeof countIcons)[number];
/** Things a child says 「幾個」 about, for 合在一起. */
export const joinIcons = ["star", "heart", "balloon", "iceCream", "acorn"] as const;
export type JoinIcon = (typeof joinIcons)[number];

export type MathQuestion =
  /** 數一數：count the pictures, then write the number. */
  | { kind: "count"; target: number; icon: CountIcon }
  /** 畫圈圈：draw this many circles. */
  | { kind: "draw"; target: number }
  /** 合在一起：two groups of pictures; write how many in all. */
  | { kind: "join"; target: number; parts: [number, number]; icon: JoinIcon }
  /** 畫圈圈算加法：draw circles for each number, then write the sum. */
  | { kind: "add"; target: number; parts: [number, number] }
  /** 分一分：the total and its first part are given in a 分合圖; write the other part. */
  | { kind: "split"; target: number; parts: [number, number]; icon: CountIcon }
  /** 合一合：both parts are given in a 分合圖; write the total on top. */
  | { kind: "combine"; target: number; parts: [number, number]; icon: JoinIcon }
  /** 分分看：only the total is given; write any two numbers that make it. */
  | { kind: "ways"; target: number; icon: CountIcon };

export type MathRound = {
  version: 1;
  lessonId: number;
  questions: MathQuestion[];
  /** Strokes per question, in the 0–100 coordinates of its square. */
  ink: Record<number, InkStroke[]>;
  /**
   * Circles drawn in 十格框 (5 × 2 cells, one circle each): 畫圈圈 has one frame, 畫圈圈算加法
   * one per number (cells 0–9 and 10–19). 分分看 writes its two numbers here (cells 0 and 1).
   * Any other written answer stays in ink.
   */
  work: Record<number, InkStroke[][]>;
  index: number;
  phase: "active" | "check";
  /** Questions the parent marked 需要補強 while checking. */
  needsPractice: number[];
  /** Identifies this round, so a new round never shows the previous round's ink. */
  createdAt: number;
  savedAt: number;
};

export const mathRoundSize = { count: 4, draw: 4 } as const;
/** A 十格框: two rows of five, the way a child lines up circles to count them. */
export const frameCells = 10;
/** How many cells a question keeps in `work`: 十格框 cells, or 分分看's two squares. */
export const workCells = (question: MathQuestion) =>
  question.kind === "draw"
    ? frameCells
    : question.kind === "add"
      ? 2 * frameCells
      : question.kind === "ways"
        ? 2
        : 0;
export const additionRoundSize = { join: 4, add: 4 } as const;
export const bondRoundSize = { split: 4, combine: 2, ways: 2 } as const;
export const maxCount = 10;

const shuffle = <T>(items: readonly T[], random: () => number) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const numbers = Array.from({ length: maxCount }, (_, index) => index + 1);

/** 第一課：4 數一數 then 4 畫圈圈, each part using different numbers from 1 to 10. */
export function buildCountingRound(random = Math.random): MathQuestion[] {
  const icons = shuffle(countIcons, random);
  return [
    ...shuffle(numbers, random)
      .slice(0, mathRoundSize.count)
      .map((target, index) => ({ kind: "count" as const, target, icon: icons[index] })),
    ...shuffle(numbers, random)
      .slice(0, mathRoundSize.draw)
      .map((target) => ({ kind: "draw" as const, target })),
  ];
}

const pairs = (most: number) =>
  numbers.flatMap((a) =>
    numbers.filter((b) => a <= most && b <= most && a + b <= maxCount).map((b) => [a, b] as const),
  );

/** Distinct pairs, each with a different sum, so one round practises different totals. */
function pickPairs(
  options: readonly (readonly [number, number])[],
  count: number,
  random: () => number,
) {
  const picked: [number, number][] = [];
  for (const [a, b] of shuffle(options, random))
    if (picked.length < count && !picked.some(([x, y]) => x + y === a + b)) picked.push([a, b]);
  return picked;
}

/**
 * 第三課 加法：4 合在一起 with pictures (up to 5 on each side), then 4 畫圈圈算加法 (sums up to
 * 10, at least 3).
 */
export function buildAdditionRound(random = Math.random): MathQuestion[] {
  const icons = shuffle(joinIcons, random);
  const drawn = pairs(maxCount).filter(([a, b]) => a + b >= 3);
  return [
    ...pickPairs(pairs(5), additionRoundSize.join, random).map((parts, index) => ({
      kind: "join" as const,
      target: parts[0] + parts[1],
      parts,
      icon: icons[index],
    })),
    ...pickPairs(drawn, additionRoundSize.add, random).map((parts) => ({
      kind: "add" as const,
      target: parts[0] + parts[1],
      parts,
    })),
  ];
}

/**
 * 第四課 分與合, read from a 分合圖: 4 分一分 (totals 3 to 10, each different), 2 合一合 (up to 5
 * on each side, different totals), then 2 分分看 (totals 4 to 10), in the textbook's order.
 */
export function buildBondRound(random = Math.random): MathQuestion[] {
  const pictures = shuffle(countIcons, random);
  const joined = shuffle(joinIcons, random);
  const splits = shuffle(
    numbers.filter((total) => total >= 3),
    random,
  )
    .slice(0, bondRoundSize.split)
    .map((total) => {
      const first = 1 + Math.floor(random() * (total - 1));
      return [first, total - first] as [number, number];
    });
  const ways = shuffle(
    numbers.filter((total) => total >= 4),
    random,
  ).slice(0, bondRoundSize.ways);
  return [
    ...splits.map((parts, index) => ({
      kind: "split" as const,
      target: parts[0] + parts[1],
      parts,
      icon: pictures[index],
    })),
    ...pickPairs(
      pairs(5).filter(([a, b]) => a + b >= 3),
      bondRoundSize.combine,
      random,
    ).map((parts, index) => ({
      kind: "combine" as const,
      target: parts[0] + parts[1],
      parts,
      icon: joined[index],
    })),
    ...ways.map((target, index) => ({
      kind: "ways" as const,
      target,
      icon: pictures[bondRoundSize.split + index],
    })),
  ];
}

const roundBuilders: Record<number, (random?: () => number) => MathQuestion[]> = {
  3: buildAdditionRound,
  4: buildBondRound,
};

export function newMathRound(lessonId: number, now = Date.now()): MathRound {
  return {
    version: 1,
    lessonId,
    questions: (roundBuilders[lessonId] ?? buildCountingRound)(),
    ink: {},
    work: {},
    index: 0,
    phase: "active",
    needsPractice: [],
    createdAt: now,
    savedAt: now,
  };
}

const validTarget = (value: unknown) =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= maxCount;

function validParts(value: unknown, target: number): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [a, b] = value;
  return Number.isInteger(a) && Number.isInteger(b) && a >= 1 && b >= 1 && a + b === target
    ? [a, b]
    : null;
}

function validQuestion(raw: unknown): MathQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<Record<string, unknown>>;
  if (!validTarget(item.target)) return null;
  const target = item.target as number;
  if (item.kind === "draw") return { kind: "draw", target };
  if (item.kind === "count" && countIcons.includes(item.icon as CountIcon))
    return { kind: "count", target, icon: item.icon as CountIcon };
  if (item.kind === "ways" && target >= 2 && countIcons.includes(item.icon as CountIcon))
    return { kind: "ways", target, icon: item.icon as CountIcon };
  const parts = validParts(item.parts, target);
  if (item.kind === "add" && parts) return { kind: "add", target, parts };
  if (item.kind === "join" && parts && joinIcons.includes(item.icon as JoinIcon))
    return { kind: "join", target, parts, icon: item.icon as JoinIcon };
  if (item.kind === "split" && parts && countIcons.includes(item.icon as CountIcon))
    return { kind: "split", target, parts, icon: item.icon as CountIcon };
  if (item.kind === "combine" && parts && joinIcons.includes(item.icon as JoinIcon))
    return { kind: "combine", target, parts, icon: item.icon as JoinIcon };
  return null;
}

const validPoint = (point: unknown) =>
  !!point &&
  typeof point === "object" &&
  Number.isFinite((point as { x: unknown }).x) &&
  Number.isFinite((point as { y: unknown }).y);
const validStrokes = (strokes: unknown): strokes is InkStroke[] =>
  Array.isArray(strokes) &&
  strokes.every((stroke) => Array.isArray(stroke) && stroke.every(validPoint));

/** Lenient: a damaged round is dropped rather than half-restored. */
export function validateMathRound(raw: unknown): MathRound | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<MathRound>;
  if (value.version !== 1 || !Number.isInteger(value.lessonId) || !Array.isArray(value.questions))
    return null;
  const questions = value.questions.map(validQuestion);
  if (!questions.length || questions.some((question) => !question)) return null;
  const inRound = (key: string) => {
    const index = Number(key);
    return Number.isInteger(index) && index >= 0 && index < questions.length ? index : null;
  };
  const ink: Record<number, InkStroke[]> = {};
  for (const [key, strokes] of Object.entries(value.ink ?? {})) {
    const index = inRound(key);
    if (index !== null && validStrokes(strokes)) ink[index] = strokes;
  }
  // Circles drawn before 十格框 (free drawing) do not fit the cells and are left out.
  const work: Record<number, InkStroke[][]> = {};
  for (const [key, cells] of Object.entries(value.work ?? {})) {
    const index = inRound(key);
    if (
      index !== null &&
      Array.isArray(cells) &&
      cells.length === workCells(questions[index]!) &&
      cells.every(validStrokes)
    )
      work[index] = cells;
  }
  return {
    version: 1,
    lessonId: value.lessonId!,
    questions: questions as MathQuestion[],
    ink,
    work,
    index: Number.isInteger(value.index)
      ? Math.min(Math.max(0, value.index!), questions.length - 1)
      : 0,
    phase: value.phase === "check" ? "check" : "active",
    needsPractice: Array.isArray(value.needsPractice)
      ? value.needsPractice.filter(
          (index): index is number =>
            Number.isInteger(index) && index >= 0 && index < questions.length,
        )
      : [],
    createdAt: Number.isFinite(value.createdAt) ? value.createdAt! : 0,
    savedAt: Number.isFinite(value.savedAt) ? value.savedAt! : 0,
  };
}

export function readMathRound(lessonId: number): MathRound | null {
  try {
    const raw = window.localStorage.getItem(childKey(mathRoundStorageKey(lessonId)));
    const round = raw ? validateMathRound(JSON.parse(raw)) : null;
    return round?.lessonId === lessonId ? round : null;
  } catch {
    return null;
  }
}

export function writeMathRound(round: MathRound) {
  try {
    window.localStorage.setItem(
      childKey(mathRoundStorageKey(round.lessonId)),
      JSON.stringify(round),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearMathRound(lessonId: number) {
  try {
    window.localStorage.removeItem(childKey(mathRoundStorageKey(lessonId)));
  } catch {
    // Nothing to protect.
  }
}

/** Cells of a 十格框 with a circle in them. */
export const filledCells = (cells: InkStroke[][] | undefined, from = 0) =>
  (cells ?? []).slice(from, from + frameCells).filter((strokes) => strokes.length > 0).length;

/**
 * A question counts as answered once it has a written answer, or, for 畫圈圈, a circle in the
 * frame (or ink from before the frame). 分分看 needs both of its numbers.
 */
export const isAnswered = (round: MathRound, index: number) => {
  const kind = round.questions[index]?.kind;
  if (kind === "ways") return filledCells(round.work[index]) === 2;
  return (
    (round.ink[index]?.length ?? 0) > 0 || (kind === "draw" && filledCells(round.work[index]) > 0)
  );
};

export type MathRecord = {
  lessonId: number;
  at: number;
  total: number;
  /**
   * What to practise again: what the parent marked in 第一課 (「數一數 7」), or what took more
   * than one try in 第二課 (「比長短（先對齊）」).
   */
  needsPractice: { kind: string; target?: number; parts?: number[] }[];
};
export type MathRecords = { version: 1; rounds: MathRecord[] };
const maxRecords = 60;

export function readMathRecords(): MathRecords {
  try {
    const raw = window.localStorage.getItem(childKey(storageKeys.mathRecords));
    const value = raw ? (JSON.parse(raw) as Partial<MathRecords>) : null;
    return {
      version: 1,
      rounds: Array.isArray(value?.rounds) ? value.rounds.slice(-maxRecords) : [],
    };
  } catch {
    return { version: 1, rounds: [] };
  }
}

/** Kept for the parent, and later for 集章卡: what each child practised and what to revisit. */
export function recordMathResult(result: Omit<MathRecord, "at">, now = Date.now()) {
  const records = readMathRecords();
  records.rounds = [...records.rounds, { ...result, at: now }].slice(-maxRecords);
  try {
    window.localStorage.setItem(childKey(storageKeys.mathRecords), JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

export const recordMathRound = (round: MathRound, now = Date.now()) =>
  recordMathResult(
    {
      lessonId: round.lessonId,
      total: round.questions.length,
      needsPractice: round.needsPractice.map((index) => {
        const question = round.questions[index];
        return {
          kind: question.kind,
          target: question.target,
          ...("parts" in question ? { parts: question.parts } : {}),
        };
      }),
    },
    now,
  );
