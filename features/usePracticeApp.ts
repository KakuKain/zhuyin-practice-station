"use client";

import { usePersistentState } from "../lib/storage/usePersistentState";
import { useAudioPlayer } from "../lib/audio/useAudioPlayer";
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
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
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

import { exercises, lessonNumerals, lessons } from "./courses/course-data";
import { clearFillDraft, readFillDraft, writeFillDraft } from "./fill/fill-storage";
import { fillFavoriteKey } from "./practice/practice-storage";

export function usePracticeApp() {
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

  const [listenMessage, setListenMessage] = useState(
    "按下「開始聽」才會播放題目。時間會從這裡開始倒數。 ",
  );

  const { loadingMessage, resourceError, showLoading } = usePageResources(view);

  const [retryMessage, setRetryMessage] = useState("");

  const [sessionScore, setSessionScore] = useState({ listeningCorrect: 0 });

  const [reviewedIndexes, setReviewedIndexes] = useState<number[]>([]);

  const [morePanel, setMorePanel] = useState<MorePanel>("home");

  const [draftStorageError, setStorageError] = useState(false);

  const [singleQuestionPractice, setSingleQuestionPractice] = useState(false);

  const [completedFillLessons, setCompletedFillLessons] = useState<number[]>([]);

  const persistFillRef = useRef<() => void>(() => {});

  const timerRef = useRef<number | null>(null);

  const timeoutRefs = useRef<number[]>([]);

  const repeatTimeoutRef = useRef<number | null>(null);

  const repeatRemainingRef = useRef(0);

  const autoRepeatEnabledRef = useRef(false);

  const playbackEndedRef = useRef<() => void>(() => {});

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
  } = usePracticeCollection(selectedLesson);
  const [listeningSettings, setListeningSettings, settingsStorageError] = usePersistentState(
    listeningSettingsStorageKey,
    defaultListeningSettings,
    readListeningSettings,
    validateListeningSettings,
  );

  const lesson = lessons[selectedLesson];
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
  const exercise = exercises[selectedLesson] ?? exercises[0];

  const lessonLines = exercise.lines;

  const lessonItems = lessonLines.flat();
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
  } = useFillCollection(selectedLesson, lessonItems, setPracticeNotice);
  const storageError =
    draftStorageError || practiceStorageError || favoritesStorageError || settingsStorageError;

  const fillLineStarts = lessonLines.map((_, lineIndex) =>
    lessonLines.slice(0, lineIndex).reduce((count, line) => count + line.length, 0),
  );

  const writtenCount = lessonItems.filter((_, index) => fillStrokes[index]?.length).length;

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

  const onStopRepeat = useCallback(() => {
    if (repeatTimeoutRef.current !== null) window.clearTimeout(repeatTimeoutRef.current);
    repeatTimeoutRef.current = null;
  }, []);
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
    setWordInk,
    hasInk,
    setHasInk,
    canvasRef,
    wordCanvasRefs,
    clearCanvas,
    clearWordCanvas,
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
      ? `第 ${sectionQuestionIndex + 1} 詞 / ${sectionQuestionCount} · ${wordLength} 字`
      : `第 ${sectionQuestionIndex + 1} 小題 / ${sectionQuestionCount}`;

  const sessionWritingUnits = listeningQuestions.reduce(
    (count, question) => count + question.answer.split("|").length,
    0,
  );

  const isFocusMode = view === "listen";

  const lessonNumber = lessonNumerals[selectedLesson];

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
  const sessionAnsweredUnits = reviewedIndexes.reduce(
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

  const toggleCurrentQuestionSaved = () => {
    if (currentQuestionSaved) removeQuestion(selectedLesson, currentQuestion.id);
    else saveQuestion(selectedLesson, currentQuestion.id);
  };

  const openLesson = (index: number) => {
    showLoading("正在開啟課文…");
    setSelectedLesson(index);
    setPreviewMode("annotated");
    setPreviewPage(0);
    setPlayingSymbol(null);
    setPracticeState((current) => ({ ...current, recentLesson: index }));
    setView("lesson");
  };

  const clearAnswerTimers = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    timeoutRefs.current.forEach((id) => window.clearTimeout(id));
    timeoutRefs.current = [];
  }, []);
  const clearListenTimers = useCallback(() => {
    clearAnswerTimers();
    if (repeatTimeoutRef.current !== null) window.clearTimeout(repeatTimeoutRef.current);
    repeatTimeoutRef.current = null;
    repeatRemainingRef.current = 0;
    autoRepeatEnabledRef.current = false;
  }, [clearAnswerTimers]);

  useEffect(() => {
    playbackEndedRef.current = () => {
      if (!autoRepeatEnabledRef.current || repeatRemainingRef.current <= 0) return;
      const nextPlay = listeningSettings.repeatCount - repeatRemainingRef.current + 1;
      setListenMessage(
        `等待 ${listeningSettings.intervalSeconds} 秒後播放第 ${nextPlay} 次，可以繼續寫。`,
      );
      repeatTimeoutRef.current = window.setTimeout(() => {
        repeatTimeoutRef.current = null;
        if (!autoRepeatEnabledRef.current || repeatRemainingRef.current <= 0) return;
        repeatRemainingRef.current -= 1;
        setPlayCount((current) => current + 1);
        setListenMessage(`第 ${nextPlay} 次播放中，可以繼續寫。`);
        speak(currentQuestion.audioText);
      }, listeningSettings.intervalSeconds * 1000);
    };
  }, [listeningSettings, currentQuestion.audioText, speak]);

  const resetListeningQuestion = (index = 0) => {
    clearListenTimers();
    stopPlayback();
    setListenExitOpen(false);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setListenIndex(index);
    setListenPhase("ready");
    setSecondsLeft(30);
    setPlayCount(0);
    setHasInk(false);
    setWordInk([]);
    setAudioError(false);
    setRetryMessage("");
    setListenMessage("按下「開始聽」才會播放題目。時間會從這裡開始倒數。 ");
  };

  const openListening = () => {
    showLoading("正在準備聽寫…");
    setPracticeNotice("");
    setUnfavoriteUndo(null);
    setUnfavoriteFillUndo(null);
    setSessionQuestions(buildListeningSession(selectedLesson));
    resetListeningQuestion(0);
    setSessionScore({ listeningCorrect: 0 });
    setReviewedIndexes([]);
    setSingleQuestionPractice(false);
    setView("listen");
  };

  const openSavedQuestion = (lessonIndex: number, id: string) => {
    const seed = findQuestionSeed(lessonIndex, id);
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

  const rewriteFillCell = (index: number) => {
    setFillNeedsRetry((current) => (current.includes(index) ? current : [...current, index]));
    openFillCell(index);
  };

  const openFillFavorite = (favorite: FillFavorite) => {
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
    clearListenTimers();
    stopPlayback();
    setListenExitOpen(false);
    setView(singleQuestionPractice ? "practice" : "lesson");
    setListenPhase("ready");
  };

  const finishListening = useCallback(
    (early = false) => {
      clearListenTimers();
      stopPlayback();
      setSecondsLeft(0);
      setListenPhase("review");
      setListenMessage(early ? "已交卷，請家長一起看看。" : "時間到，請把平板交給家長一起看看。");
    },
    [clearListenTimers, stopPlayback],
  );

  const remainingSeconds = useEffectEvent(() => secondsLeft);
  useEffect(() => {
    if (listenExitOpen || audioLoading || (listenPhase !== "active" && listenPhase !== "retry"))
      return;

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    const timeUp = window.setTimeout(() => finishListening(), remainingSeconds() * 1000);
    timeoutRefs.current = [timeUp];

    return clearAnswerTimers;
  }, [
    clearAnswerTimers,
    finishListening,
    listenIndex,
    listenPhase,
    questionDuration,
    listenExitOpen,
    audioLoading,
  ]);

  useEffect(
    () => () => {
      clearListenTimers();
      stopPlayback();
    },
    [clearListenTimers, stopPlayback],
  );

  const startListening = () => {
    repeatRemainingRef.current = listeningSettings.repeatCount - 1;
    autoRepeatEnabledRef.current = true;
    setListenPhase("active");
    setSecondsLeft(questionDuration);
    setPlayCount(1);
    setHasInk(false);
    setWordInk([]);
    setListenMessage("第一次播放中，Canvas 已開放，可以邊聽邊寫。 ");
    speak(currentQuestion.audioText);
  };

  const startRetryWriting = () => {
    repeatRemainingRef.current = listeningSettings.repeatCount - 1;
    autoRepeatEnabledRef.current = true;
    setHasInk(false);
    setWordInk([]);
    setListenPhase("retry");
    setSecondsLeft(questionDuration);
    setPlayCount((current) => current + 1);
    setListenMessage("題目正在播放，請重新寫一次；需要時可按重播。 ");
    speak(currentQuestion.audioText);
  };

  const replayQuestion = () => {
    setPlayCount((current) => current + 1);
    speak(currentQuestion.audioText);
  };

  const fillLineForCell = (index: number) =>
    fillLineStarts.findIndex(
      (start, lineIndex) => index >= start && index < start + lessonLines[lineIndex].length,
    );

  const openFillCell = (index: number) => {
    setFillReviewOpen(false);
    setActiveFillCell(index);
  };

  const saveFillDrawing = () => {
    if (activeFillCell === null || !fillDraftRef.current.length) return;
    const index = activeFillCell;
    const lineIndex = fillLineForCell(index);
    const wasFilled = Boolean(fillStrokes[index]?.length);
    const next = {
      ...fillStrokes,
      [index]: fillDraftRef.current.map((stroke) => stroke.map((point) => ({ ...point }))),
    };
    const pending = { ...fillPendingCells };
    delete pending[index];
    const remainingRetry = fillNeedsRetry.filter((item) => item !== index);
    try {
      writeFillDraft({
        version: 1,
        lessonIndex: selectedLesson,
        savedAt: Date.now(),
        strokes: next,
        pendingCells: pending,
        needsRetry: remainingRetry,
        reviewOpen: false,
      });
    } catch {
      setStorageError(true);
    }
    fillDraftRef.current = [];
    setFillStrokes(next);
    setFillPendingCells(pending);
    setActiveFillCell(null);
    setFillParentChecked(false);
    setCompletedFillLessons((current) => current.filter((item) => item !== selectedLesson));
    setFillNeedsRetry(remainingRetry);
    if (fillNeedsRetry.includes(index)) {
      const item = lessonItems[index];
      const key = fillFavoriteKey({ lessonIndex: selectedLesson, ...item });
      if (
        !remainingRetry.some(
          (position) =>
            lessonItems[position].character === item.character &&
            lessonItems[position].zhuyin === item.zhuyin,
        )
      ) {
        setFillFavorites((current) =>
          current.map((favorite) =>
            fillFavoriteKey(favorite) === key ? { ...favorite, status: "review_later" } : favorite,
          ),
        );
      }
    }
    if (wasFilled) {
      if (remainingRetry.length) setActiveFillCell(remainingRetry[0]);
      else if (Object.keys(next).length === lessonItems.length) openFillReview();
      return;
    }
    const lineStart = fillLineStarts[lineIndex];
    const nextEmpty = lessonLines[lineIndex].findIndex(
      (_, offset) => !next[lineStart + offset]?.length,
    );
    if (nextEmpty >= 0) setActiveFillCell(lineStart + nextEmpty);
    else if (Object.keys(next).length === lessonItems.length) openFillReview();
    else {
      const nextUnwritten = lessonItems.findIndex((_, itemIndex) => !next[itemIndex]?.length);
      if (nextUnwritten >= 0) setActiveFillCell(nextUnwritten);
    }
  };

  const leaveFillCell = () => {
    if (fillDraftRef.current.length && activeFillCell !== null) {
      setFillPendingCells((current) => ({
        ...current,
        [activeFillCell]: fillDraftRef.current.map((stroke) =>
          stroke.map((point) => ({ ...point })),
        ),
      }));
      persistFillRef.current();
    }
    setActiveFillCell(null);
  };

  const confirmFillReview = () => {
    if (fillNeedsRetry.length || !fillComplete) return;
    setFillReviewOpen(false);
    setFillParentChecked(true);
    setCompletedFillLessons((current) =>
      current.includes(selectedLesson) ? current : [...current, selectedLesson],
    );
    recordSession("fill", lessonItems.length, lessonItems.length, 0);
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

  const navigate = (next: View) => {
    if (view === "fill" && next !== "fill" && !fillParentChecked && hasFillDraft) {
      persistFillRef.current();
      setFillExitTarget(next);
      return;
    }
    if (next !== "listen") clearListenTimers();
    if (next === "more") setMorePanel("home");
    if (next !== view) showLoading(next === "symbols" ? "正在準備注音…" : "正在開啟頁面…");
    setView(next);
  };

  const leaveFill = () => {
    if (!fillExitTarget) return;
    persistFillRef.current();
    const target = fillExitTarget;
    setFillExitTarget(null);
    if (target === "more") setMorePanel("home");
    setView(target);
  };
  return {
    activeFillCell,
    audioError,
    audioLoading,
    beginDrawing,
    beginFillDrawing,
    canvasRef,
    clearCanvas,
    clearFillDrawing,
    clearWordCanvas,
    completedFillLessons,
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
    openFillReview,
    openLesson,
    openListening,
    openSavedQuestion,
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
