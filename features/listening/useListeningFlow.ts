import { useRef } from "react";
import type { CatalogLesson } from "../courses/materials";
import type {
  InkStroke,
  ListeningSettings,
  ParentResult,
  PracticeSession,
  PracticeState,
  StateSetter,
  View,
} from "../types";
import type { ClipOptions } from "../../lib/audio/useAudioPlayer";
import { listeningDuration } from "../settings/listening-settings";
import {
  buildListeningSession,
  fallbackListeningQuestion,
  findQuestionSeed,
  makeQuestion,
  sectionPosition,
} from "./listening-data";
import { needsListeningExitConfirmation } from "./listening-policy";
import { useListeningCanvas } from "./useListeningCanvas";
import { useListeningPlayback } from "./useListeningPlayback";
import { useListeningRound } from "./useListeningRound";
import type { useListeningSession } from "./useListeningSession";
import type { useListeningTimers } from "./useListeningTimers";

type Options = {
  view: View;
  setView: StateSetter<View>;
  catalog: CatalogLesson[];
  lesson: CatalogLesson;
  selectedLesson: number;
  setSelectedLesson: StateSetter<number>;
  showLoading: (message: string) => void;
  session: ReturnType<typeof useListeningSession>;
  timers: ReturnType<typeof useListeningTimers>;
  listeningSettings: ListeningSettings;
  speak: (text: string, options?: ClipOptions) => void;
  stopPlayback: () => void;
  audioLoading: boolean;
  setAudioError: StateSetter<boolean>;
  practiceState: PracticeState;
  saveQuestion: (lesson: number, id: string, needsPractice?: boolean) => void;
  removeQuestion: (lesson: number, id: string) => void;
  markQuestionPracticed: (lesson: number, id: string) => void;
  recordSession: (
    mode: PracticeSession["mode"],
    answered: number,
    correct: number,
    pending: number,
  ) => void;
  setPracticeNotice: StateSetter<string>;
  clearNotices: () => void;
  /** Called when a single-question practice ends inside a course review queue. */
  continueReview: () => void;
  stopReview: () => void;
};

/**
 * Listening dictation. A whole lesson round is untimed: the child writes every question,
 * may go back or replay, then the parent checks the round at once (ready → active →
 * batch_review → result). Single-question practice from saved questions is timed and checked
 * one at a time (ready → active → review, then remediation_offer → choice → retry_ready →
 * retry → review when it needs work).
 */
export function useListeningFlow({
  view,
  setView,
  catalog,
  lesson,
  selectedLesson,
  setSelectedLesson,
  showLoading,
  session,
  timers,
  listeningSettings,
  speak,
  stopPlayback,
  audioLoading,
  setAudioError,
  practiceState,
  saveQuestion,
  removeQuestion,
  markQuestionPracticed,
  recordSession,
  setPracticeNotice,
  clearNotices,
  continueReview,
  stopReview,
}: Options) {
  const {
    listenIndex,
    setListenIndex,
    sessionQuestions: listeningQuestions,
    setSessionQuestions,
    listenPhase,
    setListenPhase,
    listenExitOpen,
    setListenExitOpen,
    secondsLeft,
    setSecondsLeft,
    listenMessage,
    setListenMessage,
    retryMessage,
    setRetryMessage,
    sessionScore,
    setSessionScore,
    listeningDrafts,
    setListeningDrafts,
    batchNeedsReview,
    setBatchNeedsReview,
    reviewedIndexes,
    setReviewedIndexes,
    singleQuestionPractice,
    setSingleQuestionPractice,
  } = session;
  const { clearListenTimers } = timers;
  const listeningDraftsRef = useRef<Record<number, InkStroke[][]>>({});

  const currentQuestion = listeningQuestions[listenIndex] ?? fallbackListeningQuestion;
  const isWordQuestion = currentQuestion.category === "words";
  const wordLength = currentQuestion.answer.split("|").length;
  const questionDuration = listeningDuration(currentQuestion, listeningSettings);

  const {
    wordInk,
    hasInk,
    canvasRef,
    wordCanvasRefs,
    readListeningInk,
    clearCanvas,
    clearWordCanvas,
    clearListeningCell,
    listeningEraserCell,
    listeningUndoAvailable,
    listeningInkNotice,
    toggleListeningEraser,
    undoListeningInk,
    beginDrawing,
    draw,
    endDrawing,
  } = useListeningCanvas({
    view,
    listenPhase,
    listenIndex,
    currentQuestion,
    isWordQuestion,
    wordLength,
    readDraft: (questionIndex, cellIndex) =>
      listeningDraftsRef.current[questionIndex]?.[cellIndex] ?? [],
  });

  const hasCompleteInk = isWordQuestion
    ? wordInk.length === wordLength && wordInk.every(Boolean)
    : hasInk;
  const { index: sectionQuestionIndex, total: sectionQuestionCount } = sectionPosition(
    listeningQuestions,
    listenIndex,
  );
  const sessionWritingUnits = listeningQuestions.reduce(
    (count, question) => count + question.answer.split("|").length,
    0,
  );
  const isSaved = (questionId: string, flag: "isFavorite" | "needsPractice") =>
    practiceState.savedQuestions.some(
      (item) => item.lessonIndex === selectedLesson && item.questionId === questionId && item[flag],
    );
  const currentQuestionSaved = isSaved(currentQuestion.id, "isFavorite");
  const pendingSessionCount = reviewedIndexes.filter((index) =>
    isSaved(listeningQuestions[index]?.id, "needsPractice"),
  ).length;
  const sessionAnsweredUnits = !singleQuestionPractice
    ? Object.values(listeningDrafts).reduce(
        (sum, cells) => sum + cells.filter((cell) => cell.length > 0).length,
        0,
      )
    : reviewedIndexes.reduce(
        (count, index) => count + (listeningQuestions[index]?.answer.split("|").length ?? 0),
        0,
      );

  const { finishListening, startListening, startRetryWriting, replayQuestion, resumeListening } =
    useListeningPlayback({
      timers,
      untimed: !singleQuestionPractice,
      listeningSettings,
      currentQuestion,
      speak,
      stopPlayback,
      clearCanvas,
      listenPhase,
      listenIndex,
      listenExitOpen,
      audioLoading,
      secondsLeft,
      questionDuration,
      setSecondsLeft,
      setListenPhase,
      setListenMessage,
    });

  const round = useListeningRound({
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
  });

  /** Every new round or single question starts without ink, timers, audio or messages. */
  const startSession = (questions: typeof listeningQuestions, single: boolean) => {
    clearNotices();
    listeningDraftsRef.current = {};
    setListeningDrafts({});
    setBatchNeedsReview([]);
    setSessionQuestions(questions);
    setSingleQuestionPractice(single);
    setSessionScore({ listeningCorrect: 0 });
    setReviewedIndexes([]);
    clearListenTimers();
    stopPlayback();
    setListenExitOpen(false);
    clearCanvas();
    setListenIndex(0);
    setListenPhase("ready");
    setSecondsLeft(30);
    setAudioError(false);
    setRetryMessage("");
    setListenMessage("");
    setView("listen");
  };

  const prepareListening = (lessonIndex: number) => {
    showLoading("正在準備聽寫…");
    startSession(buildListeningSession(lessonIndex, catalog), false);
  };

  const openListening = () => prepareListening(selectedLesson);

  const openSavedQuestion = (lessonIndex: number, id: string, queued = false) => {
    if (!queued) stopReview();
    const seed = findQuestionSeed(lessonIndex, id, catalog);
    if (!seed) return false;
    showLoading("正在開啟收藏題目…");
    setSelectedLesson(lessonIndex);
    startSession([makeQuestion(seed)], true);
    return true;
  };

  const confirmLeaveFocus = () => {
    stopReview();
    clearListenTimers();
    stopPlayback();
    setListenExitOpen(false);
    setView(singleQuestionPractice ? "practice" : lesson.listeningOnly ? "courses" : "lesson");
    setListenPhase("ready");
  };

  const leaveFocus = () => {
    if (needsListeningExitConfirmation(listenPhase, reviewedIndexes.length)) {
      clearListenTimers();
      stopPlayback();
      setListenExitOpen(true);
      return;
    }
    confirmLeaveFocus();
  };

  const toggleCurrentQuestionSaved = () => {
    if (currentQuestionSaved) removeQuestion(selectedLesson, currentQuestion.id);
    else saveQuestion(selectedLesson, currentQuestion.id);
  };

  // Parent decisions and remediation exist only in single-question practice.
  const backToPractice = (notice: string) => {
    setPracticeNotice(notice);
    setView("practice");
    clearListenTimers();
    continueReview();
  };

  const handleParentDecision = (result: Exclude<ParentResult, null>) => {
    setReviewedIndexes((current) =>
      current.includes(listenIndex) ? current : [...current, listenIndex],
    );
    if (result === "correct") {
      markQuestionPracticed(selectedLesson, currentQuestion.id);
      clearNotices();
      recordSession("single", wordLength, wordLength, 0);
      backToPractice("家長已確認這題掌握，已移出待補強；收藏仍會保留。");
      return;
    }
    saveQuestion(selectedLesson, currentQuestion.id, true);
    setListenPhase("remediation_offer");
    setListenMessage("已加入待補強，可以現在練，也可以稍後再練。 ");
  };

  const deferRemediation = () => backToPractice("這題還在待補強清單，之後可以再練。");

  const selectRemediation = (answer: string) => {
    if (answer !== currentQuestion.answer) {
      setRetryMessage("再聽聽看，這個選項還不是剛剛聽到的內容。 ");
      return;
    }
    setRetryMessage("你選對了！請再寫一次。 ");
    clearCanvas();
    setListenPhase("retry_ready");
    setListenMessage("選對了！按下再聽一次並重寫，聽到聲音後開始寫。 ");
  };

  const submitRetryWriting = () => {
    if (!hasCompleteInk) return;
    clearListenTimers();
    stopPlayback();
    setSecondsLeft(0);
    setListenPhase("review");
    setListenMessage("這是補強後的手寫答案，請家長再次判定。 ");
  };

  return {
    listeningQuestions,
    listenIndex,
    listeningDrafts,
    batchNeedsReview,
    ...round,
    currentQuestion,
    currentQuestionSaved,
    isWordQuestion,
    wordLength,
    hasCompleteInk,
    sectionQuestionIndex,
    sectionQuestionCount,
    sessionScore,
    sessionAnsweredUnits,
    sessionWritingUnits,
    pendingSessionCount,
    singleQuestionPractice,
    listenPhase,
    setListenPhase,
    listenExitOpen,
    setListenExitOpen,
    listenMessage,
    retryMessage,
    setRetryMessage,
    secondsLeft,
    canvasRef,
    wordCanvasRefs,
    wordInk,
    clearWordCanvas,
    clearListeningCell,
    listeningEraserCell,
    listeningUndoAvailable,
    listeningInkNotice,
    toggleListeningEraser,
    undoListeningInk,
    beginDrawing,
    draw,
    endDrawing,
    finishListening,
    startListening,
    startRetryWriting,
    replayQuestion,
    prepareListening,
    openListening,
    openSavedQuestion,
    leaveFocus,
    confirmLeaveFocus,
    toggleCurrentQuestionSaved,
    handleParentDecision,
    deferRemediation,
    selectRemediation,
    submitRetryWriting,
  };
}
