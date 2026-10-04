import type { FillFavorite, SavedQuestion } from "../types";
export type CourseReviewItem =
  | { mode: "fill"; favorite: FillFavorite }
  | { mode: "listening"; lessonIndex: number; questionId: string };
export function courseReviewQueue(
  lessonIndex: number,
  mode: "all" | "fill" | "listening",
  fills: readonly FillFavorite[],
  listening: readonly SavedQuestion[],
): CourseReviewItem[] {
  return [
    ...(mode === "listening"
      ? []
      : fills
          .filter((item) => item.lessonIndex === lessonIndex && item.status === "needs_rewrite")
          .map((favorite) => ({ mode: "fill" as const, favorite }))),
    ...(mode === "fill"
      ? []
      : listening
          .filter((item) => item.lessonIndex === lessonIndex && item.needsPractice)
          .map((item) => ({
            mode: "listening" as const,
            lessonIndex,
            questionId: item.questionId,
          }))),
  ];
}
