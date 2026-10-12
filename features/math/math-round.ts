import type { InkStroke } from "../types";
import { childKey } from "../../lib/storage/child-profiles";
import { storageKeys } from "../../lib/storage/storage-keys";

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

export type MathQuestion =
  /** 數一數：count the pictures, then write the number. */
  | { kind: "count"; target: number; icon: CountIcon }
  /** 畫圈圈：draw this many circles. */
  | { kind: "draw"; target: number };

export type MathRound = {
  version: 1;
  lessonId: number;
  questions: MathQuestion[];
  /** Strokes per question, in the 0–100 coordinates of its square. */
  ink: Record<number, InkStroke[]>;
  index: number;
  phase: "active" | "check";
  /** Questions the parent marked 需要補強 while checking. */
  needsPractice: number[];
  /** Identifies this round, so a new round never shows the previous round's ink. */
  createdAt: number;
  savedAt: number;
};

export const mathRoundSize = { count: 4, draw: 4 } as const;
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

export function newMathRound(lessonId: number, now = Date.now()): MathRound {
  return {
    version: 1,
    lessonId,
    questions: buildCountingRound(),
    ink: {},
    index: 0,
    phase: "active",
    needsPractice: [],
    createdAt: now,
    savedAt: now,
  };
}

const validTarget = (value: unknown) =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= maxCount;

function validQuestion(raw: unknown): MathQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<Record<string, unknown>>;
  if (!validTarget(item.target)) return null;
  const target = item.target as number;
  if (item.kind === "draw") return { kind: "draw", target };
  if (item.kind === "count" && countIcons.includes(item.icon as CountIcon))
    return { kind: "count", target, icon: item.icon as CountIcon };
  return null;
}

const validPoint = (point: unknown) =>
  !!point &&
  typeof point === "object" &&
  Number.isFinite((point as { x: unknown }).x) &&
  Number.isFinite((point as { y: unknown }).y);

/** Lenient: a damaged round is dropped rather than half-restored. */
export function validateMathRound(raw: unknown): MathRound | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<MathRound>;
  if (value.version !== 1 || !Number.isInteger(value.lessonId) || !Array.isArray(value.questions))
    return null;
  const questions = value.questions.map(validQuestion);
  if (!questions.length || questions.some((question) => !question)) return null;
  const ink: Record<number, InkStroke[]> = {};
  for (const [key, strokes] of Object.entries(value.ink ?? {})) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= questions.length) continue;
    if (
      Array.isArray(strokes) &&
      strokes.every((stroke) => Array.isArray(stroke) && stroke.every(validPoint))
    )
      ink[index] = strokes as InkStroke[];
  }
  return {
    version: 1,
    lessonId: value.lessonId!,
    questions: questions as MathQuestion[],
    ink,
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

export function readMathRound(): MathRound | null {
  try {
    const raw = window.localStorage.getItem(childKey(storageKeys.mathRound));
    return raw ? validateMathRound(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeMathRound(round: MathRound) {
  try {
    window.localStorage.setItem(childKey(storageKeys.mathRound), JSON.stringify(round));
    return true;
  } catch {
    return false;
  }
}

export function clearMathRound() {
  try {
    window.localStorage.removeItem(childKey(storageKeys.mathRound));
  } catch {
    // Nothing to protect.
  }
}

/** A question counts as answered once it has any ink. */
export const isAnswered = (round: MathRound, index: number) => (round.ink[index]?.length ?? 0) > 0;

export type MathRecord = {
  lessonId: number;
  at: number;
  total: number;
  /** What the parent marked to practise again, e.g. 「數一數 7」. */
  needsPractice: { kind: MathQuestion["kind"]; target: number }[];
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
export function recordMathRound(round: MathRound, now = Date.now()) {
  const records = readMathRecords();
  records.rounds = [
    ...records.rounds,
    {
      lessonId: round.lessonId,
      at: now,
      total: round.questions.length,
      needsPractice: round.needsPractice.map((index) => ({
        kind: round.questions[index].kind,
        target: round.questions[index].target,
      })),
    },
  ].slice(-maxRecords);
  try {
    window.localStorage.setItem(childKey(storageKeys.mathRecords), JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}
