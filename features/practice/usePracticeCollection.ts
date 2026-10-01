"use client";

import { useState } from "react";
import { usePersistentState } from "../../lib/storage/usePersistentState";
import {
  initialPracticeState,
  practiceStorageKey,
  readPracticeState,
  validatePracticeState,
} from "./practice-storage";
import { appendPracticeSession, updateQuestionFlags } from "./practice-state";
import type { PracticeSession, SavedQuestion } from "../types";

export function usePracticeCollection(lessonIndex: number) {
  const [practiceState, setPracticeState, practiceStorageError] = usePersistentState(
    practiceStorageKey,
    initialPracticeState,
    readPracticeState,
    validatePracticeState,
  );
  const [practiceNotice, setPracticeNotice] = useState("");
  const [unfavoriteUndo, setUnfavoriteUndo] = useState<Pick<
    SavedQuestion,
    "lessonIndex" | "questionId"
  > | null>(null);
  const saveQuestion = (lesson: number, id: string, needsPractice = false) => {
    setPracticeState((current) =>
      updateQuestionFlags(
        current,
        lesson,
        id,
        needsPractice ? { needsPractice: true } : { isFavorite: true },
      ),
    );
  };
  const markQuestionPracticed = (lesson: number, id: string) => {
    setPracticeState((current) =>
      updateQuestionFlags(current, lesson, id, { needsPractice: false }),
    );
  };
  const removeQuestion = (lesson: number, id: string) => {
    setPracticeState((current) => updateQuestionFlags(current, lesson, id, { isFavorite: false }));
    setUnfavoriteUndo({ lessonIndex: lesson, questionId: id });
    setPracticeNotice("已取消收藏；如果仍需補強，題目會繼續保留。");
  };
  const undoUnfavorite = () => {
    if (!unfavoriteUndo) return;
    saveQuestion(unfavoriteUndo.lessonIndex, unfavoriteUndo.questionId);
    setUnfavoriteUndo(null);
    setPracticeNotice("已恢復收藏。");
  };
  const toggleSavedQuestion = (lesson: number, id: string, isFavorite: boolean) => {
    if (isFavorite) removeQuestion(lesson, id);
    else {
      saveQuestion(lesson, id);
      setUnfavoriteUndo(null);
    }
  };
  const recordSession = (
    mode: PracticeSession["mode"],
    answeredUnits: number,
    correctUnits: number,
    pendingQuestions: number,
  ) => {
    const session = {
      id: crypto.randomUUID(),
      completedAt: Date.now(),
      lessonIndex,
      mode,
      answeredUnits,
      correctUnits,
      pendingQuestions,
    };
    setPracticeState((current) => appendPracticeSession(current, session));
  };
  return {
    practiceState,
    setPracticeState,
    practiceStorageError,
    practiceNotice,
    setPracticeNotice,
    unfavoriteUndo,
    setUnfavoriteUndo,
    saveQuestion,
    markQuestionPracticed,
    removeQuestion,
    undoUnfavorite,
    toggleSavedQuestion,
    recordSession,
  };
}
