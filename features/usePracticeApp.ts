"use client";
import { courseReviewQueue, type CourseReviewItem } from "./practice/course-review";
import { isListeningAnswerComplete } from "./listening/listening-policy";

import { usePersistentState } from "../lib/storage/usePersistentState";
import { useAudioPlayer } from "../lib/audio/useAudioPlayer";
import { useCustomRecordings } from "../lib/audio/useCustomRecordings";
import { readListeningSettings, validateListeningSettings } from "./settings/listening-settings";
import { useFillDraft } from "./fill/useFillDraft";
import { useFillCanvas } from "./fill/useFillCanvas";
import { useListeningCanvas } from "./listening/useListeningCanvas";
import { needsListeningExitConfirmation } from "./listening/listening-policy";
import { usePagePosition } from "./navigation/usePagePosition";
import { useDialogKeyboard } from "./navigation/useDialogKeyboard";
import { usePageResources } from "../lib/loading/usePageResources";
import { usePracticeCollection } from "./practice/usePracticeCollection";
import { useFillCollection } from "./practice/useFillCollection";
import { useLessonPreview } from "./lesson/useLessonPreview";
import { listeningDuration } from "./settings/listening-settings";
import { useRef, useState } from "react";
import type {
  FillDraft,
  FillFavorite,
  InkStroke,
  ListenPhase,
  ListeningQuestion,
  MorePanel,
  ParentResult,
  View,
} from "./types";
import {
  buildListeningSession,
  defaultListeningSettings,
  fallbackListeningQuestion,
  findQuestionSeed,
  listeningSettingsStorageKey,
  makeQuestion,
  sectionPosition,
} from "./listening/listening-data";

import { useListeningTimers } from "./listening/useListeningTimers";
import { useListeningPlayback } from "./listening/useListeningPlayback";
import { usePracticeNavigation } from "./navigation/practice-navigation";
import { useMaterials } from "./courses/useMaterials";
import { clearFillDraft, readFillDraft } from "./fill/fill-storage";
import { isFillCellComplete } from "./fill/fill-draft-policy";
import { useFillProgress } from "./fill/fill-progress";

export function usePracticeApp() {
  const materials = useMaterials();
  const { catalog } = materials;
  const [view, setView] = useState<View>("courses");

  const [selectedLesson, setSelectedLesson] = useState(0);

  const [fillStrokes, setFillStrokes] = useState<Record<number, InkStroke[]>>({});

  const [fillPendingCells, setFillPendingCells] = useState<Record<number, InkStroke[]>>({});

  const [fillDraftReady, setFillDraftReady] = useState(false);

  const [fillResumeDraft, setFillResumeDraft] = useState<FillDraft | null>(null);

  const [fillExitTarget, setFillExitTarget] = useState<View | null>(null);

  const [activeFillCell, setActiveFillCell] = useState<number | null>(null);

  const [fillReviewOpen, setFillReviewOpen] = useState(false);

  const [fillNeedsRetry, setFillNeedsRetry] = useState<number[]>([]);

  const [fillParentChecked, setFillParentChecked] = useState(false);

  const [fillPracticeTarget, setFillPracticeTarget] = useState<FillFavorite | null>(null);

  const [fillPracticePhase, setFillPracticePhase] = useState<"writing" | "review">("writing");

  const [fillPracticeStrokes, setFillPracticeStrokes] = useState<InkStroke[]>([]);

  const [listenIndex, setListenIndex] = useState(0);

  const [sessionQuestions, setSessionQuestions] = useState<ListeningQuestion[]>([]);

  const [listenPhase, setListenPhase] = useState<ListenPhase>("ready");

  const [listenExitOpen, setListenExitOpen] = useState(false);

  const [fillPracticeExitOpen, setFillPracticeExitOpen] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(30);

  const [playCount, setPlayCount] = useState(0);

  const [listenMessage, setListenMessage] = useState("");

  const { loadingMessage, resourceError, showLoading } = usePageResources(view);

  const [retryMessage, setRetryMessage] = useState("");

  const [sessionScore, setSessionScore] = useState({ listeningCorrect: 0 });

  const reviewQueueRef = useRef<CourseReviewItem[]>([]);
  const listeningDraftsRef = useRef<Record<number, InkStroke[][]>>({});
  const [listeningDrafts, setListeningDrafts] = useState<Record<number, InkStroke[][]>>({});
  const [batchNeedsReview, setBatchNeedsReview] = useState<number[]>([]);

  const [reviewedIndexes, setReviewedIndexes] = useState<number[]>([]);

  const [morePanel, setMorePanel] = useState<MorePanel>("home");

  const [draftStorageError, setStorageError] = useState(false);

  const [singleQuestionPractice, setSingleQuestionPractice] = useState(false);

  const [completedFillLessons, setCompletedFillLessons] = useState<number[]>([]);

  const persistFillRef = useRef<() => void>(() => {});

  const timers = useListeningTimers();
  const { clearListenTimers, playbackEndedRef, onStopRepeat } = timers;

  const {
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
  } = usePracticeCollection(selectedLesson, catalog);
  const [listeningSettings, setListeningSettings, settingsStorageError] = usePersistentState(
    listeningSettingsStorageKey,
    defaultListeningSettings,
    readListeningSettings,
    validateListeningSettings,
  );

  const lesson = catalog.find((item) => item.index === selectedLesson) ?? catalog[0];
  const {
    previewMode,
    setPreviewMode,
    previewPage,
    setPreviewPage,
    previewColumns,
    previewPointerStartRef,
    previewWheelAtRef,
    previewPageCount,
    previewPageStart,
    previewVisibleLines,
  } = useLessonPreview(lesson.lines);
  const exercise = lesson.exercise;

  const lessonLines =
    lesson.custom || lesson.listeningOnly
      ? exercise.lines
      : [exercise.lines[exercise.lines.length - 1], ...exercise.lines.slice(0, -1)];

  const lessonItems = exercise.lines.flat();
  const {
    fillFavorites,
    setFillFavorites,
    favoritesStorageError,
    toggleFillFavorite,
    unfavoriteFill,
    saveFillFavorite,
    markFillMastered,
    unfavoriteFillUndo,
    setUnfavoriteFillUndo,
    undoFillUnfavorite,
  } = useFillCollection(selectedLesson, lessonItems, setPracticeNotice, catalog);
  const storageError =
    draftStorageError || practiceStorageError || favoritesStorageError || settingsStorageError;

  const fillLineStarts = lessonLines.map((_, lineIndex) =>
    !lesson.custom && lineIndex === 0
      ? lessonItems.length - lessonLines[0].length
      : lessonLines
          .slice(lesson.custom ? 0 : 1, lineIndex)
          .reduce((count, line) => count + line.length, 0),
  );

  const writtenCount = lessonItems.filter((_, index) =>
    isFillCellComplete(index, fillStrokes, fillPendingCells),
  ).length;

  const fillComplete = writtenCount === lessonItems.length;

  const {
    fillHasInk,
    setFillHasInk,
    fillIsDirty,
    setFillIsDirty,
    fillCanvasRef,
    fillDraftRef,
    fillActiveStrokeRef,
    beginFillDrawing,
    moveFillDrawing,
    endFillDrawing,
    clearFillDrawing,
    fillEraserActive,
    fillCanUndo,
    fillInkNotice,
    toggleFillEraser,
    undoFillInk,
  } = useFillCanvas({
    view,
    activeFillCell,
    fillPracticePhase,
    fillPracticeTarget,
    fillStrokes,
    fillNeedsRetry,
    fillPendingCells,
    fillParentChecked,
    selectedLesson,
    setFillParentChecked,
    setCompletedFillLessons,
    setFillPendingCells,
    persistFillRef,
  });

  const customAudio = useCustomRecordings();
  const {
    playingSymbol,
    setPlayingSymbol,
    audioError,
    setAudioError,
    audioLoading,
    playbackRef,
    stopPlayback,
    finishPlayback,
    speak,
    playPreviewSymbol,
  } = useAudioPlayer({
    view,
    lessonSymbols: lesson.symbols,
    sessionQuestions,
    playbackEndedRef,
    setPracticeNotice,
    onStopRepeat,
    getCustomRecording: customAudio.get,
  });

  const hasFillDraft =
    writtenCount > 0 || Object.keys(fillPendingCells).length > 0 || (view === "fill" && fillHasInk);
  useFillDraft({
    view,
    fillDraftReady,
    fillResumeDraft,
    fillParentChecked,
    selectedLesson,
    fillPendingCells,
    activeFillCell,
    fillStrokes,
    fillNeedsRetry,
    fillReviewOpen,
    fillDraftRef,
    fillActiveStrokeRef,
    persistFillRef,
    hasFillDraft,
    setStorageError,
  });

  const listeningQuestions = sessionQuestions;

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

  const sectionProgress = singleQuestionPractice
    ? "單題重練"
    : isWordQuestion
      ? `第 ${sectionQuestionIndex + 1} 題 / ${sectionQuestionCount} · ${wordLength} 字`
      : `第 ${sectionQuestionIndex + 1} 題 / ${sectionQuestionCount}`;

  const sessionWritingUnits = listeningQuestions.reduce(
    (count, question) => count + question.answer.split("|").length,
    0,
  );

  const isFocusMode = view === "listen";

  const lessonNumber = lesson.number;

  const currentQuestionSaved = practiceState.savedQuestions.some(
    (item) =>
      item.lessonIndex === selectedLesson &&
      item.questionId === currentQuestion.id &&
      item.isFavorite,
  );

  const pendingSessionCount = reviewedIndexes.filter((index) =>
    practiceState.savedQuestions.some(
      (item) =>
        item.lessonIndex === selectedLesson &&
        item.questionId === listeningQuestions[index]?.id &&
        item.needsPractice,
    ),
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

  usePagePosition(
    view,
    `${selectedLesson}:${view === "fill" ? (activeFillCell === null ? (fillReviewOpen ? "review" : "sheet") : activeFillCell) : view === "more" ? morePanel : view === "listen" ? `${listenIndex}:${listenPhase}` : view === "fill-practice" ? fillPracticePhase : "page"}`,
  );

  useDialogKeyboard(
    Boolean(fillResumeDraft || fillExitTarget || listenExitOpen || fillPracticeExitOpen),
    () => {
      if (fillExitTarget) setFillExitTarget(null);
      if (listenExitOpen) setListenExitOpen(false);
      if (fillPracticeExitOpen) setFillPracticeExitOpen(false);
    },
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
      setPlayCount,
      setListenMessage,
    });

  const toggleCurrentQuestionSaved = () => {
    if (currentQuestionSaved) removeQuestion(selectedLesson, currentQuestion.id);
    else saveQuestion(selectedLesson, currentQuestion.id);
  };

  const openLesson = (index: number) => {
    const nextLesson = catalog.find((item) => item.index === index);
    if (nextLesson?.listeningOnly) {
      setSelectedLesson(index);
      setPracticeState((current) => ({ ...current, recentLesson: index }));
      prepareListening(index);
      return;
    }
    showLoading("正在開啟課文…");
    setSelectedLesson(index);
    setPreviewMode("annotated");
    setPreviewPage(0);
    setPlayingSymbol(null);
    setPracticeState((current) => ({ ...current, recentLesson: index }));
    setView("lesson");
  };

  const resetListeningQuestion = (index = 0) => {
    clearListenTimers();
    stopPlayback();
    setListenExitOpen(false);
    clearCanvas();
    setListenIndex(index);
    setListenPhase("ready");
    setSecondsLeft(30);
    setPlayCount(0);
    setAudioError(false);
    setRetryMessage("");
    setListenMessage("");
  };

  const prepareListening = (lessonIndex: number) => {
    showLoading("正在準備聽寫…");
    setPracticeNotice("");
    setUnfavoriteUndo(null);
    setUnfavoriteFillUndo(null);
    listeningDraftsRef.current = {};
    setListeningDrafts({});
    setBatchNeedsReview([]);
    setSessionQuestions(buildListeningSession(lessonIndex, catalog));
    resetListeningQuestion(0);
    setSessionScore({ listeningCorrect: 0 });
    setReviewedIndexes([]);
    setSingleQuestionPractice(false);
    setView("listen");
  };

  const openListening = () => prepareListening(selectedLesson);

  const openSavedQuestion = (lessonIndex: number, id: string, queued = false) => {
    if (!queued) reviewQueueRef.current = [];
    const seed = findQuestionSeed(lessonIndex, id, catalog);
    if (!seed) return;
    showLoading("正在開啟收藏題目…");
    setSelectedLesson(lessonIndex);
    setSessionQuestions([makeQuestion(seed)]);
    setSingleQuestionPractice(true);
    setSessionScore({ listeningCorrect: 0 });
    setReviewedIndexes([]);
    setPracticeNotice("");
    setUnfavoriteUndo(null);
    setUnfavoriteFillUndo(null);
    resetListeningQuestion(0);
    setView("listen");
  };

  const openFill = () => {
    showLoading("正在準備默寫格…");
    setPracticeNotice("");
    setUnfavoriteUndo(null);
    setUnfavoriteFillUndo(null);
    const draft = readFillDraft(selectedLesson, lessonItems.length);
    setFillStrokes({});
    setFillPendingCells({});
    setActiveFillCell(null);
    setFillReviewOpen(false);
    setFillNeedsRetry([]);
    setFillParentChecked(false);
    setFillHasInk(false);
    fillDraftRef.current = [];
    setFillResumeDraft(draft);
    setFillDraftReady(!draft);
    setCompletedFillLessons((current) => current.filter((index) => index !== selectedLesson));
    setView("fill");
  };

  const resumeFillDraft = () => {
    if (!fillResumeDraft) return;
    setFillStrokes(fillResumeDraft.strokes);
    setFillPendingCells(fillResumeDraft.pendingCells);
    setFillNeedsRetry(fillResumeDraft.needsRetry);
    setFillReviewOpen(fillResumeDraft.reviewOpen);
    setActiveFillCell(null);
    setFillResumeDraft(null);
    setFillDraftReady(true);
  };

  const restartFillDraft = () => {
    try {
      clearFillDraft(selectedLesson);
    } catch {
      setStorageError(true);
    }
    setFillStrokes({});
    setFillPendingCells({});
    setFillNeedsRetry([]);
    setFillReviewOpen(false);
    setActiveFillCell(null);
    fillDraftRef.current = [];
    setFillResumeDraft(null);
    setFillDraftReady(true);
  };

  const openFillReview = () => {
    setFillReviewOpen(true);
  };

  const { fillLineForCell, openFillCell, saveFillDrawing, leaveFillCell, confirmFillReview } =
    useFillProgress({
      activeFillCell,
      fillDraftRef,
      fillStrokes,
      fillPendingCells,
      fillNeedsRetry,
      fillLineStarts,
      lessonLines,
      lessonItems,
      selectedLesson,
      setStorageError,
      setFillStrokes,
      setFillPendingCells,
      setActiveFillCell,
      setFillParentChecked,
      setCompletedFillLessons,
      setFillNeedsRetry,
      setFillFavorites,
      setFillReviewOpen,
      persistFillRef,
      fillComplete,
      recordSession,
      openFillReview,
    });

  const rewriteFillCell = (index: number) => {
    setFillNeedsRetry((current) => (current.includes(index) ? current : [...current, index]));
    openFillCell(index);
  };

  const openFillFavorite = (favorite: FillFavorite, queued = false) => {
    if (!queued) reviewQueueRef.current = [];
    showLoading("正在開啟單題重練…");
    setFillPracticeTarget(favorite);
    setSelectedLesson(favorite.lessonIndex);
    setFillPracticePhase("writing");
    setFillPracticeStrokes([]);
    setFillHasInk(false);
    setFillIsDirty(false);
    setPracticeNotice("");
    setUnfavoriteUndo(null);
    setUnfavoriteFillUndo(null);
    setView("fill-practice");
  };

  const advanceReviewQueue = () => {
    const next = reviewQueueRef.current.shift();
    if (!next) return;
    if (next.mode === "fill") openFillFavorite(next.favorite, true);
    else openSavedQuestion(next.lessonIndex, next.questionId, true);
  };
  const startCourseReview = (lessonIndex: number, mode: "all" | "fill" | "listening") => {
    reviewQueueRef.current = courseReviewQueue(
      lessonIndex,
      mode,
      fillFavorites,
      practiceState.savedQuestions,
    );
    advanceReviewQueue();
  };

  const deferFillPractice = () => {
    setPracticeNotice("已保留這題，下次可以再練。");
    setView("practice");
    advanceReviewQueue();
  };
  const removeFillFavorite = (favorite: FillFavorite) => {
    setUnfavoriteUndo(null);
    unfavoriteFill(favorite);
    setFillPracticeTarget(null);
    setView("practice");
  };
  const markFillFavoritePracticed = (favorite: FillFavorite) => {
    setUnfavoriteUndo(null);
    markFillMastered(favorite);
    recordSession("single", 1, 1, 0);
    setFillPracticeTarget(null);
    setView("practice");
    advanceReviewQueue();
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

  const confirmLeaveFocus = () => {
    reviewQueueRef.current = [];
    clearListenTimers();
    stopPlayback();
    setListenExitOpen(false);
    setView(singleQuestionPractice ? "practice" : lesson.listeningOnly ? "courses" : "lesson");
    setListenPhase("ready");
  };

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
    setPlayCount(1);
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

  const goToNextQuestion = (
    correctUnits = sessionScore.listeningCorrect,
    pendingQuestions = pendingSessionCount,
  ) => {
    if (listenIndex >= listeningQuestions.length - 1) {
      recordSession("listening", sessionWritingUnits, correctUnits, pendingQuestions);
      setView("result");
      clearListenTimers();
      return;
    }
    resetListeningQuestion(listenIndex + 1);
  };

  const handleParentDecision = (result: Exclude<ParentResult, null>) => {
    setReviewedIndexes((current) =>
      current.includes(listenIndex) ? current : [...current, listenIndex],
    );
    if (result === "correct") {
      markQuestionPracticed(selectedLesson, currentQuestion.id);
      if (singleQuestionPractice) {
        setUnfavoriteFillUndo(null);
        setUnfavoriteUndo(null);
        recordSession(
          "single",
          currentQuestion.answer.split("|").length,
          currentQuestion.answer.split("|").length,
          0,
        );
        setPracticeNotice("家長已確認這題掌握，已移出待補強；收藏仍會保留。");
        setView("practice");
        clearListenTimers();
        advanceReviewQueue();
      } else {
        setSessionScore((current) => ({
          ...current,
          listeningCorrect: current.listeningCorrect + currentQuestion.answer.split("|").length,
        }));
        const wasPending = practiceState.savedQuestions.some(
          (item) =>
            item.lessonIndex === selectedLesson &&
            item.questionId === currentQuestion.id &&
            item.needsPractice,
        );
        goToNextQuestion(
          sessionScore.listeningCorrect + currentQuestion.answer.split("|").length,
          pendingSessionCount - Number(wasPending && reviewedIndexes.includes(listenIndex)),
        );
      }
    } else {
      saveQuestion(selectedLesson, currentQuestion.id, true);
      setListenPhase("remediation_offer");
      setListenMessage("已加入待補強，可以現在練，也可以稍後再練。 ");
    }
  };

  const deferRemediation = () => {
    if (singleQuestionPractice) {
      setPracticeNotice("這題還在待補強清單，之後可以再練。");
      setView("practice");
      clearListenTimers();
      advanceReviewQueue();
    } else goToNextQuestion();
  };

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

  const { navigate, leaveFill } = usePracticeNavigation({
    view,
    fillParentChecked,
    hasFillDraft,
    persistFillRef,
    fillExitTarget,
    setFillExitTarget,
    setMorePanel,
    setView,
    showLoading,
    clearListenTimers,
  });
  return {
    listeningQuestions,
    listenIndex,
    listeningDrafts,
    batchNeedsReview,
    goToListeningQuestion,
    openBatchReview,
    nextListeningAnswer,
    toggleBatchNeedsReview,
    finishBatchReview,
    toggleBatchFavorite,
    ...materials,
    activeFillCell,
    customAudio,
    audioError,
    audioLoading,
    beginDrawing,
    beginFillDrawing,
    canvasRef,
    clearCanvas,
    clearFillDrawing,
    clearWordCanvas,
    completedFillLessons,
    clearListeningCell,
    listeningEraserCell,
    listeningUndoAvailable,
    listeningInkNotice,
    toggleListeningEraser,
    undoListeningInk,
    confirmLeaveFocus,
    confirmFillReview,
    currentQuestion,
    currentQuestionSaved,
    deferRemediation,
    draw,
    endDrawing,
    endFillDrawing,
    fillCanvasRef,
    fillComplete,
    fillDraftRef,
    fillExitTarget,
    fillFavorites,
    fillHasInk,
    fillIsDirty,
    fillLineForCell,
    fillEraserActive,
    fillCanUndo,
    fillInkNotice,
    toggleFillEraser,
    undoFillInk,
    fillLineStarts,
    fillNeedsRetry,
    fillParentChecked,
    fillPendingCells,
    fillPracticeExitOpen,
    fillPracticePhase,
    fillPracticeStrokes,
    fillPracticeTarget,
    fillResumeDraft,
    fillReviewOpen,
    fillStrokes,
    finishListening,
    finishPlayback,
    handleParentDecision,
    hasCompleteInk,
    isFocusMode,
    isWordQuestion,
    leaveFill,
    leaveFillCell,
    leaveFocus,
    lesson,
    lessonItems,
    lessonLines,
    lessonNumber,
    listenExitOpen,
    listenMessage,
    listenPhase,
    listeningSettings,
    loadingMessage,
    morePanel,
    moveFillDrawing,
    markFillFavoritePracticed,
    navigate,
    openFill,
    openFillCell,
    openFillFavorite,
    deferFillPractice,
    openFillReview,
    openLesson,
    openListening,
    openSavedQuestion,
    startCourseReview,
    pendingSessionCount,
    playCount,
    playPreviewSymbol,
    playbackRef,
    playingSymbol,
    practiceNotice,
    practiceState,
    previewColumns,
    previewMode,
    previewPage,
    previewPageCount,
    previewPageStart,
    previewPointerStartRef,
    previewVisibleLines,
    previewWheelAtRef,
    questionDuration,
    removeFillFavorite,
    saveFillFavorite,
    removeQuestion,
    replayQuestion,
    restartFillDraft,
    resumeFillDraft,
    retryMessage,
    rewriteFillCell,
    saveFillDrawing,
    secondsLeft,
    sectionProgress,
    sectionQuestionIndex,
    sectionQuestionCount,
    selectRemediation,
    selectedLesson,
    sessionScore,
    sessionAnsweredUnits,
    sessionWritingUnits,
    setCompletedFillLessons,
    setFillExitTarget,
    setFillFavorites,
    setUnfavoriteFillUndo,
    setUnfavoriteUndo,
    setFillHasInk,
    setFillParentChecked,
    setFillIsDirty,
    setFillPracticeExitOpen,
    setFillPracticePhase,
    setFillPracticeStrokes,
    setFillReviewOpen,
    setListenExitOpen,
    setListenPhase,
    setListeningSettings,
    settingsStorageError,
    setMorePanel,
    setPracticeNotice,
    setPreviewMode,
    setPreviewPage,
    setRetryMessage,
    setView,
    speak,
    startListening,
    stopPlayback,
    startRetryWriting,
    storageError,
    singleQuestionPractice,
    resourceError,
    unfavoriteUndo,
    unfavoriteFillUndo,
    undoFillUnfavorite,
    undoUnfavorite,
    toggleSavedQuestion,
    submitRetryWriting,
    toggleCurrentQuestionSaved,
    toggleFillFavorite,
    view,
    wordCanvasRefs,
    wordInk,
    wordLength,
    writtenCount,
  };
}

export type AppController = ReturnType<typeof usePracticeApp>;
