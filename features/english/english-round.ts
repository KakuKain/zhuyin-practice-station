import type { InkStroke } from "../types";
import { childKey } from "../../lib/storage/child-profiles";
import { englishRoundStorageKey, storageKeys } from "../../lib/storage/storage-keys";
import {
  dialoguesTaught,
  englishDialogues,
  englishLessons,
  englishWords,
  lettersTaught,
  type EnglishMode,
} from "./english-lessons";

/**
 * 認一認: answered by tapping, checked at once and tried again until right, like 辨音. The
 * sections follow the workbook: letters (Listen and Circle), capitals and small letters (Look,
 * Match; Find and Circle), words (Listen and Circle the sound, Circle, Write and Say, Listen and
 * Number) and, last, a dialogue (Listen and Check).
 */
export type TapQuestion =
  /** Hear a letter's name; tap it in the case asked for, among the same letter's other case. */
  | { kind: "hear-letter"; letter: string; case: Case; choices: string[] }
  /** A letter is shown; tap the same letter in the other case. */
  | { kind: "match-case"; letter: string; to: Case; choices: string[] }
  /** A capital is shown; tap every one of its small letters among look-alikes. */
  | { kind: "find-all"; letter: string; grid: string[] }
  /** Hear a word, or see its picture; tap its first letter (shown as Bb). */
  | { kind: "hear-initial" | "see-initial"; word: string; choices: string[] }
  /** Hear a word; tap its picture. */
  | { kind: "hear-word"; word: string; choices: string[] }
  /** Hear three words; tap their pictures in the order heard. */
  | { kind: "word-order"; words: string[]; pictures: string[] }
  /** Hear a dialogue; tap its scene. */
  | { kind: "dialogue"; dialogue: string; choices: string[] };

/**
 * 寫一寫: written on four lines and checked by the parent, like 默寫. 描一描 traces a letter's
 * capital and small letter (I Can Write); then letters heard (the quizzes' 大寫／小寫), the first
 * letter of a word heard (_nt, _ake) and, from 第二課, the letters missing from a row in
 * alphabetical order (Say and Write).
 */
export type WriteQuestion =
  | { kind: "trace"; letter: string }
  | { kind: "write-letter"; letter: string; case: Case }
  | { kind: "write-initial"; word: string }
  | { kind: "write-missing"; case: Case; row: string[]; blanks: number[] };

type Case = "upper" | "lower";

export const tapRoundSize = { letters: 2, cases: 3, words: 5, dialogue: 1 } as const;
export const writeRoundSize = (lessonId: number) => ({
  trace: englishLessons.find((lesson) => lesson.id === lessonId)?.letters.length ?? 3,
  letters: 4,
  words: 2,
  // The row needs letters from an earlier lesson.
  order: lettersTaught(lessonId).length > 3 ? 1 : 0,
});
export const roundLength = (lessonId: number, mode: EnglishMode) =>
  Object.values(mode === "tap" ? tapRoundSize : writeRoundSize(lessonId)).reduce(
    (sum, size) => sum + size,
    0,
  );

/** Letters a first grader mixes up, for the wrong choices. */
const lookAlikes: Record<string, string[]> = {
  a: ["d", "e", "o"],
  b: ["d", "p", "h"],
  c: ["e", "o", "a"],
  d: ["b", "a", "p"],
  e: ["c", "a"],
  f: ["t", "e"],
  g: ["j", "q", "y"],
  h: ["n", "b"],
  i: ["j", "l"],
  j: ["i", "g"],
  k: ["h", "l"],
  l: ["i", "k"],
  m: ["n", "w"],
};

const shuffle = <T>(items: readonly T[], random: () => number) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
const pickOne = <T>(items: readonly T[], random: () => number) =>
  items[Math.floor(random() * items.length)];
const shown = (letter: string, letterCase: Case) =>
  letterCase === "upper" ? letter.toUpperCase() : letter;

/** A look-alike the child has been taught, or else another taught letter. */
function lookAlike(letter: string, taught: readonly string[], random: () => number) {
  const known = (lookAlikes[letter] ?? []).filter((other) => taught.includes(other));
  return known.length
    ? pickOne(known, random)
    : pickOne(
        taught.filter((other) => other !== letter),
        random,
      );
}

function lessonOf(lessonId: number) {
  const lesson = englishLessons.find((item) => item.id === lessonId);
  if (!lesson) throw new Error(`No English lesson ${lessonId}`);
  return lesson;
}

/** Words the child can name the first letter of: this lesson's, starting with a taught letter. */
const initialWords = (lessonId: number) =>
  lessonOf(lessonId).words.filter((word) => lettersTaught(lessonId).includes(word[0]));

export function buildTapRound(lessonId: number, random = Math.random): TapQuestion[] {
  const lesson = lessonOf(lessonId);
  const taught = lettersTaught(lessonId);
  const own = shuffle(lesson.letters, random);
  const section = <T>(items: T[]) => shuffle(items, random);

  // Listen and Circle: the letter in the case asked for, beside the same letter's other case and
  // a look-alike, as 「a A」 and 「d a」 in the workbook.
  const hearLetters = (["upper", "lower"] as const).map((letterCase, index) => {
    const letter = own[index % own.length];
    const other = letterCase === "upper" ? "lower" : "upper";
    return {
      kind: "hear-letter" as const,
      letter,
      case: letterCase,
      choices: shuffle(
        [
          shown(letter, letterCase),
          shown(letter, other),
          shown(lookAlike(letter, taught, random), letterCase),
        ],
        random,
      ),
    };
  });

  // Look, Match: a capital to its small letter and back; Find and Circle: every small letter.
  const matchLetters = shuffle(own, random);
  const matches = (["lower", "upper"] as const).map((to, index) => {
    const letter = matchLetters[index % matchLetters.length];
    const wrong = shuffle(
      [...new Set([lookAlike(letter, taught, random), ...shuffle(taught, random)])].filter(
        (other) => other !== letter,
      ),
      random,
    ).slice(0, 2);
    return {
      kind: "match-case" as const,
      letter,
      to,
      choices: shuffle([letter, ...wrong], random).map((choice) => shown(choice, to)),
    };
  });
  const findLetter = matchLetters[2 % matchLetters.length];
  const others = [lookAlike(findLetter, taught, random), ...taught.filter((l) => l !== findLetter)];
  const hits = 3 + Math.floor(random() * 2);
  const grid = shuffle(
    [
      ...Array<string>(hits).fill(findLetter),
      ...Array.from({ length: 8 - hits }, (_, index) =>
        index < 3 ? others[0] : pickOne(others, random),
      ),
    ],
    random,
  );

  // Words: the first letter heard and seen, the picture heard, three pictures in order.
  const words = shuffle(initialWords(lessonId), random);
  const initialChoices = (word: string) =>
    shuffle(
      [
        word[0],
        ...shuffle(
          taught.filter((letter) => letter !== word[0]),
          random,
        ).slice(0, 2),
      ],
      random,
    );
  const heard = shuffle(lesson.words, random);
  const order = shuffle(lesson.words, random).slice(0, 3);
  const wordQuestions: TapQuestion[] = [
    { kind: "hear-initial", word: words[0], choices: initialChoices(words[0]) },
    { kind: "hear-initial", word: words[1], choices: initialChoices(words[1]) },
    { kind: "see-initial", word: words[2], choices: initialChoices(words[2]) },
    {
      kind: "hear-word",
      word: heard[0],
      choices: shuffle(
        [heard[0], heard.find((word) => word[0] !== heard[0][0]) ?? heard[1]],
        random,
      ),
    },
    { kind: "word-order", words: order, pictures: shuffle(order, random) },
  ];

  // Listen and Check: this lesson's dialogue against another one taught, never two goodbyes.
  const dialogue = pickOne(lesson.dialogues, random);
  const group = englishDialogues[dialogue].group;
  const other = pickOne(
    dialoguesTaught(lessonId).filter(
      (id) => id !== dialogue && (!group || englishDialogues[id].group !== group),
    ),
    random,
  );

  return [
    ...section(hearLetters),
    ...section([...matches, { kind: "find-all" as const, letter: findLetter, grid }]),
    ...section(wordQuestions),
    { kind: "dialogue", dialogue, choices: shuffle([dialogue, other], random) },
  ];
}

const missingPatterns = [
  [0, 3, 4],
  [0, 2, 4],
  [1, 3],
  [1, 4],
  [2, 4],
  [0, 2],
];

export function buildWriteRound(lessonId: number, random = Math.random): WriteQuestion[] {
  const lesson = lessonOf(lessonId);
  const taught = lettersTaught(lessonId);
  const size = writeRoundSize(lessonId);
  const upper = shuffle(lesson.letters, random).slice(0, 2);
  const lower = shuffle(lesson.letters, random).slice(0, 2);
  const words = shuffle(initialWords(lessonId), random).slice(0, size.words);
  const rows: WriteQuestion[] = [];
  if (size.order) {
    // Five letters in a row with two or three missing, never side by side at the start, as the
    // workbook's 「_ B C _ _」 and 「_ c _ e _」.
    const start = Math.floor(random() * (taught.length - 4));
    rows.push({
      kind: "write-missing",
      case: random() < 0.5 ? "upper" : "lower",
      row: taught.slice(start, start + 5),
      blanks: pickOne(missingPatterns, random),
    });
  }
  return [
    ...lesson.letters.map((letter) => ({ kind: "trace" as const, letter })),
    ...shuffle(
      [
        ...upper.map((letter) => ({
          kind: "write-letter" as const,
          letter,
          case: "upper" as Case,
        })),
        ...lower.map((letter) => ({
          kind: "write-letter" as const,
          letter,
          case: "lower" as Case,
        })),
      ],
      random,
    ),
    ...words.map((word) => ({ kind: "write-initial" as const, word })),
    ...rows,
  ];
}

/** The answer taps of a tapped question, in order where order matters. */
export function tapAnswer(question: TapQuestion): number[] {
  switch (question.kind) {
    case "hear-letter":
      return [question.choices.indexOf(shown(question.letter, question.case))];
    case "match-case":
      return [question.choices.indexOf(shown(question.letter, question.to))];
    case "find-all":
      return question.grid.flatMap((letter, index) => (letter === question.letter ? [index] : []));
    case "hear-initial":
    case "see-initial":
      return [question.choices.indexOf(question.word[0])];
    case "hear-word":
      return [question.choices.indexOf(question.word)];
    case "word-order":
      return question.words.map((word) => question.pictures.indexOf(word));
    case "dialogue":
      return [question.choices.indexOf(question.dialogue)];
  }
}

export const tapInAnyOrder = (question: TapQuestion) => question.kind === "find-all";

export const tapPromptId = (question: TapQuestion) =>
  question.kind === "hear-letter"
    ? `hear-${question.case}`
    : question.kind === "match-case"
      ? `to-${question.to}`
      : question.kind;

export const writePromptId = (question: WriteQuestion) =>
  question.kind === "write-letter" ? `write-${question.case}` : question.kind;

/** The English clips that follow the instruction, in order. */
export function tapClips(question: TapQuestion): string[] {
  switch (question.kind) {
    case "hear-letter":
      return [`letter-${question.letter}`];
    case "hear-initial":
    case "hear-word":
      return [`word-${question.word}`];
    case "word-order":
      return question.words.map((word) => `word-${word}`);
    case "dialogue":
      return [`dialogue-${question.dialogue}`];
    default:
      return [];
  }
}

export function writeClips(question: WriteQuestion): string[] {
  switch (question.kind) {
    case "trace":
    case "write-letter":
      return [`letter-${question.letter}`];
    case "write-initial":
      return [`word-${question.word}`];
    case "write-missing":
      return [];
  }
}

/** The section a question belongs to, in the header. */
export const tapSection = (question: TapQuestion) =>
  question.kind === "hear-letter"
    ? "字母"
    : question.kind === "match-case" || question.kind === "find-all"
      ? "大寫和小寫"
      : question.kind === "dialogue"
        ? "對話"
        : "單字";

export const writeSection = (question: WriteQuestion) =>
  question.kind === "trace"
    ? "描一描"
    : question.kind === "write-letter"
      ? "聽寫字母"
      : question.kind === "write-initial"
        ? "單字"
        : "字母順序";

/** How the result and the parent name a question: 「聽 B 點大寫」, 「apple 的第一個字母」. */
export function tapTopic(question: TapQuestion) {
  switch (question.kind) {
    case "hear-letter":
      return `聽 ${shown(question.letter, question.case)}`;
    case "match-case":
      return `${shown(question.letter, question.to === "upper" ? "lower" : "upper")} 配 ${shown(question.letter, question.to)}`;
    case "find-all":
      return `找出所有的 ${question.letter}`;
    case "hear-initial":
    case "see-initial":
      return `${question.word} 的第一個字母`;
    case "hear-word":
      return `聽 ${question.word} 點圖`;
    case "word-order":
      return `照順序：${question.words.join("、")}`;
    case "dialogue":
      return `對話 ${englishDialogues[question.dialogue].lines.join(" ")}`;
  }
}

export function writeTopic(question: WriteQuestion) {
  switch (question.kind) {
    case "trace":
      return `描 ${question.letter.toUpperCase()}${question.letter}`;
    case "write-letter":
      return `寫${question.case === "upper" ? "大寫" : "小寫"} ${shown(question.letter, question.case)}`;
    case "write-initial":
      return `${question.word} 的第一個字母`;
    case "write-missing":
      return question.row
        .map((letter, index) =>
          question.blanks.includes(index) ? "＿" : shown(letter, question.case),
        )
        .join(" ");
  }
}

/** The letters a writing question expects, one per square, in the case to write them. */
export function writeAnswer(question: WriteQuestion): string[] {
  switch (question.kind) {
    case "trace":
      return [question.letter.toUpperCase(), question.letter];
    case "write-letter":
      return [shown(question.letter, question.case)];
    case "write-initial":
      return [question.word[0]];
    case "write-missing":
      return question.blanks.map((index) => shown(question.row[index], question.case));
  }
}

/**
 * Rounds that do not repeat themselves: of several candidates, the one sharing the fewest
 * letters, words and dialogues with this lesson's last round, as math rounds do.
 */
export const roundCandidates = 200;

export function englishTraits(questions: readonly (TapQuestion | WriteQuestion)[]): string[] {
  return [
    ...new Set(
      questions.map((question) => {
        const subject =
          "letter" in question
            ? question.letter
            : "word" in question
              ? question.word
              : "dialogue" in question
                ? question.dialogue
                : "words" in question
                  ? question.words.join(",")
                  : question.row.join("");
        return `${question.kind}:${"case" in question ? question.case : ""}:${subject}`;
      }),
    ),
  ];
}

export function variedEnglishRound<Question extends TapQuestion | WriteQuestion>(
  build: () => Question[],
  last: readonly string[],
): Question[] {
  const seen = new Set(last);
  let best = build();
  let bestShared = Infinity;
  for (let attempt = 0; attempt < roundCandidates; attempt++) {
    const round = attempt ? build() : best;
    const shared = englishTraits(round).filter((trait) => seen.has(trait)).length;
    if (shared < bestShared) [best, bestShared] = [round, shared];
    if (!shared) break;
  }
  return best;
}

function readRecent(): Record<string, string[]> {
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(childKey(storageKeys.englishRecent)) ?? "{}",
    );
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, string[]] =>
          Array.isArray(entry[1]) && entry[1].every((trait) => typeof trait === "string"),
      ),
    );
  } catch {
    return {};
  }
}

/** A new round for this child, unlike their last one of the same lesson and mode. */
export function newEnglishQuestions<Mode extends EnglishMode>(
  lessonId: number,
  mode: Mode,
): Mode extends "tap" ? TapQuestion[] : WriteQuestion[];
export function newEnglishQuestions(lessonId: number, mode: EnglishMode) {
  const recent = readRecent();
  const key = `${lessonId}:${mode}`;
  const round =
    mode === "tap"
      ? variedEnglishRound(() => buildTapRound(lessonId), recent[key] ?? [])
      : variedEnglishRound(() => buildWriteRound(lessonId), recent[key] ?? []);
  try {
    window.localStorage.setItem(
      childKey(storageKeys.englishRecent),
      JSON.stringify({ ...recent, [key]: englishTraits(round) }),
    );
  } catch {
    // Only variety is lost.
  }
  return round;
}

/** 寫一寫's round, saved as it goes so a reload or a closed app continues it. */
export type EnglishWriteRound = {
  version: 1;
  lessonId: number;
  questions: WriteQuestion[];
  /** Strokes per question, one list per square, in the 0–100 coordinates of the square. */
  work: Record<number, InkStroke[][]>;
  index: number;
  phase: "active" | "check";
  needsPractice: number[];
  createdAt: number;
  savedAt: number;
};

export const squaresOf = (question: WriteQuestion) => writeAnswer(question).length;

export function newWriteRound(lessonId: number, now = Date.now()): EnglishWriteRound {
  return {
    version: 1,
    lessonId,
    questions: newEnglishQuestions(lessonId, "write"),
    work: {},
    index: 0,
    phase: "active",
    needsPractice: [],
    createdAt: now,
    savedAt: now,
  };
}

const isLetter = (value: unknown): value is string =>
  typeof value === "string" && /^[a-z]$/.test(value);
const isCase = (value: unknown): value is Case => value === "upper" || value === "lower";

function validWriteQuestion(raw: unknown): WriteQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<Record<string, unknown>>;
  if (item.kind === "trace" && isLetter(item.letter)) return { kind: "trace", letter: item.letter };
  if (item.kind === "write-letter" && isLetter(item.letter) && isCase(item.case))
    return { kind: "write-letter", letter: item.letter, case: item.case };
  if (item.kind === "write-initial" && typeof item.word === "string" && item.word in englishWords)
    return { kind: "write-initial", word: item.word };
  if (
    item.kind === "write-missing" &&
    isCase(item.case) &&
    Array.isArray(item.row) &&
    item.row.length > 1 &&
    item.row.every(isLetter) &&
    Array.isArray(item.blanks) &&
    item.blanks.length > 0 &&
    item.blanks.every(
      (index) => Number.isInteger(index) && index >= 0 && index < (item.row as string[]).length,
    )
  )
    return {
      kind: "write-missing",
      case: item.case,
      row: item.row as string[],
      blanks: item.blanks as number[],
    };
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
export function validateWriteRound(raw: unknown): EnglishWriteRound | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<EnglishWriteRound>;
  if (value.version !== 1 || !Number.isInteger(value.lessonId) || !Array.isArray(value.questions))
    return null;
  const questions = value.questions.map(validWriteQuestion);
  if (!questions.length || questions.some((question) => !question)) return null;
  const work: Record<number, InkStroke[][]> = {};
  for (const [key, cells] of Object.entries(value.work ?? {})) {
    const index = Number(key);
    const question = questions[index];
    if (
      question &&
      Array.isArray(cells) &&
      cells.length === squaresOf(question) &&
      cells.every(validStrokes)
    )
      work[index] = cells;
  }
  return {
    version: 1,
    lessonId: value.lessonId!,
    questions: questions as WriteQuestion[],
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

export function readWriteRound(lessonId: number): EnglishWriteRound | null {
  try {
    const raw = window.localStorage.getItem(childKey(englishRoundStorageKey(lessonId)));
    const round = raw ? validateWriteRound(JSON.parse(raw)) : null;
    return round?.lessonId === lessonId ? round : null;
  } catch {
    return null;
  }
}

export function writeWriteRound(round: EnglishWriteRound) {
  try {
    window.localStorage.setItem(
      childKey(englishRoundStorageKey(round.lessonId)),
      JSON.stringify(round),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearWriteRound(lessonId: number) {
  try {
    window.localStorage.removeItem(childKey(englishRoundStorageKey(lessonId)));
  } catch {
    // Nothing to protect.
  }
}

/** Answered once every square of the question has ink. */
export const isWritten = (round: EnglishWriteRound, index: number) => {
  const cells = round.work[index] ?? [];
  return (
    cells.length === squaresOf(round.questions[index]) && cells.every((cell) => cell.length > 0)
  );
};

export type EnglishRecord = {
  lessonId: number;
  mode: EnglishMode;
  at: number;
  total: number;
  /** What to practise again, as the result names it: 「聽 B」, 「寫小寫 d」. */
  needsPractice: string[];
};
export type EnglishRecords = { version: 1; rounds: EnglishRecord[] };
const maxRecords = 60;

export function readEnglishRecords(): EnglishRecords {
  try {
    const raw = window.localStorage.getItem(childKey(storageKeys.englishRecords));
    const value = raw ? (JSON.parse(raw) as Partial<EnglishRecords>) : null;
    return {
      version: 1,
      rounds: Array.isArray(value?.rounds) ? value.rounds.slice(-maxRecords) : [],
    };
  } catch {
    return { version: 1, rounds: [] };
  }
}

/** Kept for the parent: what each child practised and what to revisit. */
export function recordEnglishResult(result: Omit<EnglishRecord, "at">, now = Date.now()) {
  const records = readEnglishRecords();
  records.rounds = [...records.rounds, { ...result, at: now }].slice(-maxRecords);
  try {
    window.localStorage.setItem(childKey(storageKeys.englishRecords), JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}
