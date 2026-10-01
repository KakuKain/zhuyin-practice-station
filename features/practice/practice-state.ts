import type { PracticeSession, PracticeState, SavedQuestion } from "../types";

export function updateQuestionFlags(
  state: PracticeState,
  lessonIndex: number,
  questionId: string,
  flags: Partial<Pick<SavedQuestion, "isFavorite" | "needsPractice">>,
): PracticeState {
  const existing = state.savedQuestions.find(
    (item) => item.lessonIndex === lessonIndex && item.questionId === questionId,
  );
  const next = {
    lessonIndex,
    questionId,
    isFavorite: false,
    needsPractice: false,
    ...existing,
    ...flags,
  };
  const savedQuestions = state.savedQuestions.filter(
    (item) => item.lessonIndex !== lessonIndex || item.questionId !== questionId,
  );
  if (next.isFavorite || next.needsPractice) savedQuestions.push(next);
  return { ...state, savedQuestions };
}

export function appendPracticeSession(
  state: PracticeState,
  session: PracticeSession,
): PracticeState {
  if (state.history.some((item) => item.id === session.id)) return state;
  return {
    ...state,
    completedSessions: state.completedSessions + 1,
    history: [session, ...state.history].slice(0, 20),
  };
}
