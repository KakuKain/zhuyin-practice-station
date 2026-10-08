import { useRef } from "react";
import { courseReviewQueue, type CourseReviewItem } from "./practice/course-review";
import { usePersistentState } from "../lib/storage/usePersistentState";
import { useAudioPlayer } from "../lib/audio/useAudioPlayer";
import { useCustomRecordings } from "../lib/audio/useCustomRecordings";
import { usePageResources } from "../lib/loading/usePageResources";
import { readListeningSettings, validateListeningSettings } from "./settings/listening-settings";
import { usePagePosition } from "./navigation/usePagePosition";
import { useDialogKeyboard } from "./navigation/useDialogKeyboard";
import { useNavigationSession } from "./navigation/useNavigationSession";
import { usePracticeNavigation } from "./navigation/practice-navigation";
import { usePracticeCollection } from "./practice/usePracticeCollection";
import { useFillCollection } from "./practice/useFillCollection";
import { useLessonPreview } from "./lesson/useLessonPreview";
import { useMaterials } from "./courses/useMaterials";
import { useListeningSession } from "./listening/useListeningSession";
import { useListeningTimers } from "./listening/useListeningTimers";
import { useListeningFlow } from "./listening/useListeningFlow";
import {
  defaultListeningSettings,
  findQuestionSeed,
  listeningSettingsStorageKey,
} from "./listening/listening-data";
import { fillLayout } from "./fill/fill-layout";
import { useFillFlow } from "./fill/useFillFlow";

/**
 * Cross-feature coordinator: the current view and lesson, shared stores, audio, the course
 * review queue and the controller object components read. Each practice flow owns its own
 * state and actions (useListeningFlow, useFillFlow); this hook only wires them together.
 */
export function usePracticeApp() {
  const materials = useMaterials();
  const { catalog } = materials;
  const { view, setView, selectedLesson, setSelectedLesson, morePanel, setMorePanel } =
    useNavigationSession();
  const { loadingMessage, resourceError, showLoading } = usePageResources(view);

  const lesson = catalog.find((item) => item.index === selectedLesson) ?? catalog[0];
  const layout = fillLayout(lesson);
  const preview = useLessonPreview(lesson.lines);

  const practice = usePracticeCollection(selectedLesson, catalog);
  const { practiceState, setPracticeState, setPracticeNotice, setUnfavoriteUndo } = practice;
  const fillCollection = useFillCollection(
    selectedLesson,
    layout.lessonItems,
    setPracticeNotice,
    catalog,
  );
  const { fillFavorites, setUnfavoriteFillUndo } = fillCollection;
  const [listeningSettings, setListeningSettings, settingsStorageError] = usePersistentState(
    listeningSettingsStorageKey,
    defaultListeningSettings,
    readListeningSettings,
    validateListeningSettings,
  );

  /** Undo offers and notices belong to the screen that showed them. */
  const clearNotices = () => {
    setPracticeNotice("");
    setUnfavoriteUndo(null);
    setUnfavoriteFillUndo(null);
  };

  // Course review: queued favorites open one after another until the queue is empty.
  const reviewQueueRef = useRef<CourseReviewItem[]>([]);
  const stopReview = () => {
    reviewQueueRef.current = [];
  };
  const continueReview = () => advanceReviewQueue();

  const listeningSession = useListeningSession();
  const timers = useListeningTimers();
  const customAudio = useCustomRecordings();
  const audio = useAudioPlayer({
    view,
    lessonSymbols: lesson.symbols,
    sessionQuestions: listeningSession.sessionQuestions,
    playbackEndedRef: timers.playbackEndedRef,
    setPracticeNotice,
    onStopRepeat: timers.onStopRepeat,
    getCustomRecording: customAudio.get,
  });

  const listening = useListeningFlow({
    view,
    setView,
    catalog,
    lesson,
    selectedLesson,
    setSelectedLesson,
    showLoading,
    session: listeningSession,
    timers,
    listeningSettings,
    speak: audio.speak,
    stopPlayback: audio.stopPlayback,
    audioLoading: audio.audioLoading,
    setAudioError: audio.setAudioError,
    practiceState,
    saveQuestion: practice.saveQuestion,
    removeQuestion: practice.removeQuestion,
    markQuestionPracticed: practice.markQuestionPracticed,
    recordSession: practice.recordSession,
    setPracticeNotice,
    clearNotices,
    continueReview,
    stopReview,
  });

  const fill = useFillFlow({
    view,
    setView,
    selectedLesson,
    setSelectedLesson,
    layout,
    showLoading,
    setFillFavorites: fillCollection.setFillFavorites,
    unfavoriteFill: fillCollection.unfavoriteFill,
    markFillMastered: fillCollection.markFillMastered,
    recordSession: practice.recordSession,
    setPracticeNotice,
    setUnfavoriteUndo,
    clearNotices,
    continueReview,
    stopReview,
  });

  function advanceReviewQueue() {
    // A question whose lesson can no longer be resolved is skipped, not a dead end.
    for (let next = reviewQueueRef.current.shift(); next; next = reviewQueueRef.current.shift()) {
      if (next.mode === "fill") {
        fill.openFillFavorite(next.favorite, true);
        return;
      }
      if (listening.openSavedQuestion(next.lessonIndex, next.questionId, true)) return;
    }
  }
  const startCourseReview = (lessonIndex: number, mode: "all" | "fill" | "listening") => {
    reviewQueueRef.current = courseReviewQueue(
      lessonIndex,
      mode,
      fillFavorites,
      practiceState.savedQuestions,
    ).filter(
      (item) =>
        item.mode === "fill" ||
        Boolean(findQuestionSeed(item.lessonIndex, item.questionId, catalog)),
    );
    advanceReviewQueue();
  };

  const openLesson = (index: number) => {
    const nextLesson = catalog.find((item) => item.index === index);
    setSelectedLesson(index);
    setPracticeState((current) => ({ ...current, recentLesson: index }));
    if (nextLesson?.listeningOnly) {
      listening.prepareListening(index);
      return;
    }
    showLoading("正在開啟課文…");
    preview.setPreviewMode("annotated");
    preview.setPreviewPage(0);
    audio.setPlayingSymbol(null);
    setView("lesson");
  };

  const { navigate, leaveFill } = usePracticeNavigation({
    view,
    fillParentChecked: fill.fillParentChecked,
    hasFillDraft: fill.hasFillDraft,
    persistFillRef: fill.persistFillRef,
    fillExitTarget: fill.fillExitTarget,
    setFillExitTarget: fill.setFillExitTarget,
    setMorePanel,
    setView,
    showLoading,
    clearListenTimers: timers.clearListenTimers,
  });

  usePagePosition(
    view,
    `${selectedLesson}:${view === "fill" ? (fill.activeFillCell === null ? (fill.fillReviewOpen ? "review" : "sheet") : fill.activeFillCell) : view === "more" ? morePanel : view === "listen" ? `${listening.listenIndex}:${listening.listenPhase}` : view === "fill-practice" ? fill.fillPracticePhase : "page"}`,
  );
  useDialogKeyboard(
    Boolean(
      fill.fillResumeDraft ||
      fill.fillExitTarget ||
      listening.listenExitOpen ||
      fill.fillPracticeExitOpen,
    ),
    () => {
      if (fill.fillExitTarget) fill.setFillExitTarget(null);
      if (listening.listenExitOpen) listening.setListenExitOpen(false);
      if (fill.fillPracticeExitOpen) fill.setFillPracticeExitOpen(false);
    },
  );

  const storageError =
    fill.draftStorageError ||
    practice.practiceStorageError ||
    fillCollection.favoritesStorageError ||
    settingsStorageError;

  return {
    ...materials,
    ...practice,
    ...fillCollection,
    ...preview,
    ...listening,
    ...fill,
    customAudio,
    audioError: audio.audioError,
    audioLoading: audio.audioLoading,
    playingSymbol: audio.playingSymbol,
    playbackRef: audio.playbackRef,
    finishPlayback: audio.finishPlayback,
    stopPlayback: audio.stopPlayback,
    speak: audio.speak,
    playPreviewSymbol: audio.playPreviewSymbol,
    warmSymbols: audio.warmSymbols,
    view,
    setView,
    navigate,
    leaveFill,
    isFocusMode: view === "listen",
    morePanel,
    setMorePanel,
    selectedLesson,
    lesson,
    lessonNumber: lesson.number,
    ...layout,
    openLesson,
    startCourseReview,
    listeningSettings,
    setListeningSettings,
    settingsStorageError,
    storageError,
    loadingMessage,
    resourceError,
  };
}

export type AppController = ReturnType<typeof usePracticeApp>;
