import type { FillFavorite, PracticeSession, PracticeState, SavedQuestion } from "../types";
import {
  findQuestionSeed,
  legacySavedQuestionIndexes,
  questionId,
} from "../listening/listening-data";
import {
  catalogExercises,
  storedCatalog,
  type CatalogLesson,
  validSyllable,
} from "../courses/materials";

export const practiceStorageKey = "zhuyin-practice-state-v4";
export const thirdPracticeStorageKey = "zhuyin-practice-state-v3";

export const fillFavoritesStorageKey = "zhuyin-fill-favorites-v1";

export const previousPracticeStorageKey = "zhuyin-practice-state-v2";

export const firstPracticeStorageKey = "zhuyin-practice-state-v1";

export const initialPracticeState: PracticeState = {
  savedQuestions: [],
  recentLesson: null,
  completedSessions: 0,
  history: [],
};

export function validatePracticeState(
  raw: unknown,
  version: 1 | 2 | 3 | 4 = 4,
  catalog = storedCatalog(),
  preserveUnavailableLessons = false,
): PracticeState {
  const exercises = catalogExercises(catalog);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return initialPracticeState;
  const parsed = raw as Record<string, unknown>;
  const savedQuestions = (
    Array.isArray(parsed.savedQuestions) ? parsed.savedQuestions : []
  ).flatMap((item): SavedQuestion[] => {
    if (
      !item ||
      typeof item !== "object" ||
      !Number.isSafeInteger(item.lessonIndex) ||
      (!exercises[item.lessonIndex] && !(preserveUnavailableLessons && item.lessonIndex >= 9))
    )
      return [];
    let id = item.questionId;
    if (version < 3) {
      const legacyIndex = Number.isInteger(item.questionIndex)
        ? version === 2
          ? item.questionIndex
          : legacySavedQuestionIndexes[item.lessonIndex]?.[item.questionIndex]
        : undefined;
      const legacy =
        legacyIndex === undefined ? undefined : exercises[item.lessonIndex]?.questions[legacyIndex];
      id = legacy ? questionId(legacy) : undefined;
    }
    return typeof id === "string" &&
      (findQuestionSeed(item.lessonIndex, id, catalog) ||
        (preserveUnavailableLessons &&
          item.lessonIndex >= 9 &&
          !exercises[item.lessonIndex] &&
          /^(characters|words):[\p{Script=Han}]{1,8}$/u.test(id)))
      ? [
          {
            lessonIndex: item.lessonIndex,
            questionId: id,
            // Older records cannot distinguish a star from automatic remediation.
            // Preserve all old stars as well as pending work instead of losing a favorite.
            isFavorite:
              version < 4 || item.isFavorite === undefined ? true : item.isFavorite === true,
            needsPractice: Boolean(item.needsPractice),
          },
        ]
      : [];
  });
  const merged = new Map<string, SavedQuestion>();
  for (const item of savedQuestions) {
    const key = `${item.lessonIndex}:${item.questionId}`;
    const previous = merged.get(key);
    merged.set(key, {
      ...item,
      isFavorite: item.isFavorite || Boolean(previous?.isFavorite),
      needsPractice: item.needsPractice || Boolean(previous?.needsPractice),
    });
  }
  const history = (Array.isArray(parsed.history) ? parsed.history : []).flatMap(
    (item): PracticeSession[] => {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item.id !== "string" ||
        !item.id ||
        !Number.isSafeInteger(item.lessonIndex) ||
        (!exercises[item.lessonIndex] && !(preserveUnavailableLessons && item.lessonIndex >= 9)) ||
        !["fill", "listening", "single"].includes(item.mode) ||
        !Number.isFinite(item.completedAt) ||
        item.completedAt <= 0 ||
        !Number.isInteger(item.answeredUnits) ||
        item.answeredUnits < 1 ||
        item.answeredUnits > 200 ||
        !Number.isInteger(item.correctUnits) ||
        item.correctUnits < 0 ||
        item.correctUnits > item.answeredUnits ||
        !Number.isInteger(item.pendingQuestions) ||
        item.pendingQuestions < 0 ||
        item.pendingQuestions > item.answeredUnits
      )
        return [];
      return [
        {
          id: item.id.slice(0, 100),
          lessonIndex: item.lessonIndex,
          mode: item.mode,
          completedAt: item.completedAt,
          answeredUnits: item.answeredUnits,
          correctUnits: item.correctUnits,
          pendingQuestions: item.pendingQuestions,
        },
      ];
    },
  );
  return {
    savedQuestions: [...merged.values()].filter((item) => item.isFavorite || item.needsPractice),
    history: history
      .filter((item, index) => history.findIndex((other) => other.id === item.id) === index)
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, 20),
    recentLesson:
      typeof parsed.recentLesson === "number" &&
      Number.isInteger(parsed.recentLesson) &&
      (exercises[parsed.recentLesson] || (preserveUnavailableLessons && parsed.recentLesson >= 9))
        ? parsed.recentLesson
        : null,
    completedSessions:
      typeof parsed.completedSessions === "number" && Number.isFinite(parsed.completedSessions)
        ? Math.max(0, Math.floor(parsed.completedSessions))
        : 0,
  };
}

export function readPracticeState(
  storage: Storage,
  catalog = storedCatalog(),
  preserveUnavailableLessons = false,
): PracticeState {
  for (const [key, version] of [
    [practiceStorageKey, 4],
    [thirdPracticeStorageKey, 3],
    [previousPracticeStorageKey, 2],
    [firstPracticeStorageKey, 1],
  ] as const) {
    const stored = storage.getItem(key);
    if (stored !== null)
      return validatePracticeState(
        JSON.parse(stored),
        version,
        catalog,
        preserveUnavailableLessons,
      );
  }
  return initialPracticeState;
}

export function readFillFavorites(
  storage: Storage,
  catalog = storedCatalog(),
  preserveUnavailableLessons = false,
): FillFavorite[] {
  const stored = storage.getItem(fillFavoritesStorageKey);
  return stored
    ? validatedFillFavorites(JSON.parse(stored), catalog, preserveUnavailableLessons)
    : [];
}

export function fillFavoriteKey(
  item: Pick<FillFavorite, "lessonIndex" | "character" | "zhuyin">,
): string {
  return `${item.lessonIndex}:${item.character}:${item.zhuyin}`;
}

export function fillLocation(
  lessonIndex: number,
  position: number,
  catalog: readonly CatalogLesson[] = storedCatalog(),
): string {
  const lines = catalogExercises([...catalog])[lessonIndex]?.lines ?? [];
  let start = 0;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    if (position < start + lines[lineIndex].length)
      return `第 ${lineIndex + 1} 行第 ${position - start + 1} 格`;
    start += lines[lineIndex].length;
  }
  return "課文";
}

export function validatedFillFavorites(
  raw: unknown,
  catalog = storedCatalog(),
  preserveUnavailableLessons = false,
): FillFavorite[] {
  if (!Array.isArray(raw)) return [];
  const exercises = catalogExercises(catalog);
  const result = new Map<string, FillFavorite>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Partial<FillFavorite>;
    const lessonIndex = candidate.lessonIndex;
    if (
      typeof lessonIndex !== "number" ||
      !Number.isSafeInteger(lessonIndex) ||
      (!exercises[lessonIndex] && !(preserveUnavailableLessons && lessonIndex >= 9))
    )
      continue;
    const lessonItems = exercises[lessonIndex]?.lines.flat();
    const unavailable = !lessonItems && preserveUnavailableLessons && lessonIndex >= 9;
    const positions = Array.isArray(candidate.positions)
      ? candidate.positions.filter(
          (position): position is number =>
            typeof position === "number" &&
            Number.isInteger(position) &&
            position >= 0 &&
            position < 200 &&
            (unavailable ||
              (lessonItems?.[position]?.character === candidate.character &&
                lessonItems?.[position]?.zhuyin === candidate.zhuyin)),
        )
      : [];
    if (
      !positions.length ||
      typeof candidate.character !== "string" ||
      typeof candidate.zhuyin !== "string" ||
      (unavailable &&
        (!/^[\p{Script=Han}]$/u.test(candidate.character) || !validSyllable(candidate.zhuyin)))
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
          : candidate.status === "mastered"
            ? "mastered"
            : "review_later",
      isFavorite: candidate.isFavorite !== false || Boolean(existing?.isFavorite),
    });
  }
  return [...result.values()].filter((item) => item.isFavorite || item.status === "needs_rewrite");
}
