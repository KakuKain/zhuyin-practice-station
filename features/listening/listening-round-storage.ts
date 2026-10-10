import type { InkStroke, ListenCategory, ListeningQuestion } from "../types";
import { storageKeys } from "../../lib/storage/storage-keys";
import { validInkStrokes } from "../fill/fill-storage";

/** An unfinished whole-lesson round: the drawn question order, position and every answer. */
export type SavedListeningRound = {
  version: 1;
  lessonIndex: number;
  savedAt: number;
  questions: ListeningQuestion[];
  index: number;
  phase: "active" | "batch_review";
  drafts: Record<number, InkStroke[][]>;
  batchNeedsReview: number[];
};

/** After a reload within this time the app reopens the round; older rounds wait for the lesson. */
export const resumeOnStartMs = 12 * 60 * 60 * 1000;

const categories: readonly ListenCategory[] = ["symbols", "characters", "words"];
const isText = (value: unknown, max = 40): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= max;

function validQuestion(raw: unknown): raw is ListeningQuestion {
  if (!raw || typeof raw !== "object") return false;
  const question = raw as Partial<ListeningQuestion>;
  return (
    categories.includes(question.category as ListenCategory) &&
    isText(question.id, 80) &&
    isText(question.audioText) &&
    isText(question.answer, 80) &&
    Array.isArray(question.distractors) &&
    question.distractors.every((item) => isText(item, 80)) &&
    Array.isArray(question.choices) &&
    question.choices.every((item) => isText(item, 80))
  );
}

export function validateListeningRound(raw: unknown): SavedListeningRound | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const round = raw as Partial<SavedListeningRound>;
  const questions = round.questions;
  if (
    round.version !== 1 ||
    !Number.isSafeInteger(round.lessonIndex) ||
    !Number.isFinite(round.savedAt) ||
    !Array.isArray(questions) ||
    !questions.length ||
    questions.length > 200 ||
    !questions.every(validQuestion) ||
    !Number.isInteger(round.index) ||
    round.index! < 0 ||
    round.index! >= questions.length ||
    (round.phase !== "active" && round.phase !== "batch_review") ||
    !round.drafts ||
    typeof round.drafts !== "object" ||
    !Array.isArray(round.batchNeedsReview)
  )
    return null;
  const drafts: Record<number, InkStroke[][]> = {};
  for (const [key, cells] of Object.entries(round.drafts)) {
    const index = Number(key);
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= questions.length ||
      !Array.isArray(cells) ||
      cells.length > questions[index].answer.split("|").length ||
      !cells.every(validInkStrokes)
    )
      return null;
    drafts[index] = cells;
  }
  return {
    version: 1,
    lessonIndex: round.lessonIndex!,
    savedAt: round.savedAt!,
    questions,
    index: round.index!,
    phase: round.phase,
    drafts,
    batchNeedsReview: round.batchNeedsReview.filter(
      (index): index is number => Number.isInteger(index) && index >= 0 && index < questions.length,
    ),
  };
}

export function readListeningRound(): SavedListeningRound | null {
  try {
    const raw = window.localStorage.getItem(storageKeys.listeningRound);
    return raw ? validateListeningRound(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** A round saved recently enough to reopen right away when the app starts. */
export function startupListeningRound(now = Date.now()): SavedListeningRound | null {
  if (typeof window === "undefined") return null;
  const round = readListeningRound();
  return round && now - round.savedAt < resumeOnStartMs ? round : null;
}

export function writeListeningRound(round: SavedListeningRound) {
  try {
    window.localStorage.setItem(storageKeys.listeningRound, JSON.stringify(round));
    return true;
  } catch {
    return false;
  }
}

export function clearListeningRound() {
  try {
    window.localStorage.removeItem(storageKeys.listeningRound);
  } catch {
    // Nothing to protect: the round simply cannot be resumed.
  }
}

/** Questions with any writing, for the resume prompt. */
export const answeredQuestions = (round: SavedListeningRound) =>
  Object.values(round.drafts).filter((cells) => cells.some((cell) => cell.length > 0)).length;
