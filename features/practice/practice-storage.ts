import type { FillFavorite, PracticeState, SavedQuestion } from "../types";
import {
  findQuestionSeed,
  legacySavedQuestionIndexes,
  questionId,
} from "../listening/listening-data";
import { exercises } from "../courses/course-data";

export const practiceStorageKey = "zhuyin-practice-state-v3";

export const fillFavoritesStorageKey = "zhuyin-fill-favorites-v1";

export const previousPracticeStorageKey = "zhuyin-practice-state-v2";

export const firstPracticeStorageKey = "zhuyin-practice-state-v1";

export const initialPracticeState: PracticeState = {
  savedQuestions: [],
  recentLesson: null,
  completedSessions: 0,
};

export function validatePracticeState(raw: unknown, version: 1 | 2 | 3 = 3): PracticeState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return initialPracticeState;
  const parsed = raw as Record<string, unknown>;
  const savedQuestions = (
    Array.isArray(parsed.savedQuestions) ? parsed.savedQuestions : []
  ).flatMap((item): SavedQuestion[] => {
    if (
      !item ||
      typeof item !== "object" ||
      !Number.isInteger(item.lessonIndex) ||
      !exercises[item.lessonIndex]
    )
      return [];
    let id = item.questionId;
    if (version !== 3) {
      const legacyIndex = Number.isInteger(item.questionIndex)
        ? version === 2
          ? item.questionIndex
          : legacySavedQuestionIndexes[item.lessonIndex]?.[item.questionIndex]
        : undefined;
      const legacy =
        legacyIndex === undefined ? undefined : exercises[item.lessonIndex].questions[legacyIndex];
      id = legacy ? questionId(legacy) : undefined;
    }
    return typeof id === "string" && findQuestionSeed(item.lessonIndex, id)
      ? [
          {
            lessonIndex: item.lessonIndex,
            questionId: id,
            needsPractice: Boolean(item.needsPractice),
          },
        ]
      : [];
  });
  return {
    savedQuestions: savedQuestions.filter(
      (item, index) =>
        savedQuestions.findIndex(
          (other) => other.lessonIndex === item.lessonIndex && other.questionId === item.questionId,
        ) === index,
    ),
    recentLesson:
      typeof parsed.recentLesson === "number" &&
      Number.isInteger(parsed.recentLesson) &&
      exercises[parsed.recentLesson]
        ? parsed.recentLesson
        : null,
    completedSessions:
      typeof parsed.completedSessions === "number" && Number.isFinite(parsed.completedSessions)
        ? Math.max(0, Math.floor(parsed.completedSessions))
        : 0,
  };
}

export function readPracticeState(storage: Storage): PracticeState {
  for (const [key, version] of [
    [practiceStorageKey, 3],
    [previousPracticeStorageKey, 2],
    [firstPracticeStorageKey, 1],
  ] as const) {
    const stored = storage.getItem(key);
    if (stored !== null) return validatePracticeState(JSON.parse(stored), version);
  }
  return initialPracticeState;
}

export function readFillFavorites(storage: Storage): FillFavorite[] {
  const stored = storage.getItem(fillFavoritesStorageKey);
  return stored ? validatedFillFavorites(JSON.parse(stored)) : [];
}

export function fillFavoriteKey(
  item: Pick<FillFavorite, "lessonIndex" | "character" | "zhuyin">,
): string {
  return `${item.lessonIndex}:${item.character}:${item.zhuyin}`;
}

export function fillLocation(lessonIndex: number, position: number): string {
  const lines = exercises[lessonIndex].lines;
  let start = 0;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    if (position < start + lines[lineIndex].length)
      return `第 ${lineIndex + 1} 行第 ${position - start + 1} 格`;
    start += lines[lineIndex].length;
  }
  return "課文";
}

export function validatedFillFavorites(raw: unknown): FillFavorite[] {
  if (!Array.isArray(raw)) return [];
  const result = new Map<string, FillFavorite>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Partial<FillFavorite>;
    const lessonIndex = candidate.lessonIndex;
    if (
      typeof lessonIndex !== "number" ||
      !Number.isInteger(lessonIndex) ||
      !exercises[lessonIndex]
    )
      continue;
    const lessonItems = exercises[lessonIndex].lines.flat();
    const positions = Array.isArray(candidate.positions)
      ? candidate.positions.filter(
          (position): position is number =>
            typeof position === "number" &&
            Number.isInteger(position) &&
            lessonItems[position]?.character === candidate.character &&
            lessonItems[position]?.zhuyin === candidate.zhuyin,
        )
      : [];
    if (
      !positions.length ||
      typeof candidate.character !== "string" ||
      typeof candidate.zhuyin !== "string"
    )
      continue;
    const key = fillFavoriteKey({
      lessonIndex,
      character: candidate.character,
      zhuyin: candidate.zhuyin,
    });
    const existing = result.get(key);
    result.set(key, {
      lessonIndex,
      character: candidate.character,
      zhuyin: candidate.zhuyin,
      positions: [...new Set([...(existing?.positions ?? []), ...positions])].sort((a, b) => a - b),
      status:
        candidate.status === "needs_rewrite" || existing?.status === "needs_rewrite"
          ? "needs_rewrite"
          : "review_later",
    });
  }
  return [...result.values()];
}
