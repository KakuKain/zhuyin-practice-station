import type { RefObject } from "react";
import type {
  InkStroke,
  ListeningQuestion,
  PracticeSession,
  PracticeState,
  StateSetter,
  View,
} from "../types";
import type { ClipOptions } from "../../lib/audio/useAudioPlayer";
import type { useListeningSession } from "./useListeningSession";
import { isListeningAnswerComplete } from "./listening-policy";
type Options = {
  session: ReturnType<typeof useListeningSession>;
  listeningDraftsRef: RefObject<Record<number, InkStroke[][]>>;
  readListeningInk: () => InkStroke[][];
  clearListenTimers: () => void;
  stopPlayback: () => void;
  resumeListening: () => void;
  listeningQuestions: ListeningQuestion[];
  speak: (text: string, options?: ClipOptions) => void;
  markQuestionPracticed: (lesson: number, id: string) => void;
  selectedLesson: number;
  saveQuestion: (lesson: number, id: string, needsPractice?: boolean) => void;
  recordSession: (
    mode: PracticeSession["mode"],
    answered: number,
    correct: number,
    pending: number,
  ) => void;
  sessionWritingUnits: number;
  setView: StateSetter<View>;
  practiceState: PracticeState;
  removeQuestion: (lesson: number, id: string) => void;
};

export function useListeningRound({
  session,
  listeningDraftsRef,
  readListeningInk,
  clearListenTimers,
  stopPlayback,
  resumeListening,
  listeningQuestions,
  speak,
  markQuestionPracticed,
  selectedLesson,
  saveQuestion,
  recordSession,
  sessionWritingUnits,
  setView,
  practiceState,
  removeQuestion,
}: Options) {
  const {
    listenIndex,
    listenPhase,
    setListeningDrafts,
    setListenIndex,
    setListenPhase,
    setBatchNeedsReview,
    batchNeedsReview,
    setReviewedIndexes,
    setSessionScore,
  } = session;
  const captureListeningAnswer = () => {
    const next = { ...listeningDraftsRef.current, [listenIndex]: readListeningInk() };
    listeningDraftsRef.current = next;
    setListeningDrafts(next);
    return next;
  };
  const goToListeningQuestion = (index: number) => {
    if (listenPhase !== "batch_review") captureListeningAnswer();
    clearListenTimers();
    stopPlayback();
    setListenIndex(index);
    setListenPhase("active");
    resumeListening();
    const question = listeningQuestions[index];
    speak(question.audioText, { pronunciation: question.answer });
  };
  const openBatchReview = () => {
    captureListeningAnswer();
    clearListenTimers();
    stopPlayback();
    setListenPhase("batch_review");
  };
  const nextListeningAnswer = () => {
    if (listenIndex === listeningQuestions.length - 1) openBatchReview();
    else goToListeningQuestion(listenIndex + 1);
  };
  const toggleBatchNeedsReview = (index: number) =>
    setBatchNeedsReview((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );
  const finishBatchReview = () => {
    let correctUnits = 0;
    let pending = 0;
    listeningQuestions.forEach((question, index) => {
      const units = question.answer.split("|").length;
      const cells = listeningDraftsRef.current[index] ?? [];
      const complete = isListeningAnswerComplete(question.answer, cells);
      if (complete && !batchNeedsReview.includes(index)) {
        correctUnits += units;
        markQuestionPracticed(selectedLesson, question.id);
      } else {
        pending++;
        saveQuestion(selectedLesson, question.id, true);
      }
    });
    setReviewedIndexes(listeningQuestions.map((_, index) => index));
    setSessionScore({ listeningCorrect: correctUnits });
    recordSession("listening", sessionWritingUnits, correctUnits, pending);
    setView("result");
  };
  const toggleBatchFavorite = (questionId: string) => {
    const favorite = practiceState.savedQuestions.some(
      (item) =>
        item.lessonIndex === selectedLesson && item.questionId === questionId && item.isFavorite,
    );
    if (favorite) removeQuestion(selectedLesson, questionId);
    else saveQuestion(selectedLesson, questionId);
  };

  return {
    goToListeningQuestion,
    openBatchReview,
    nextListeningAnswer,
    toggleBatchNeedsReview,
    finishBatchReview,
    toggleBatchFavorite,
  };
}
