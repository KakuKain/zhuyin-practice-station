import { useCallback, useEffect, useEffectEvent } from "react";
import type { ListenPhase, ListeningQuestion, ListeningSettings, StateSetter } from "../types";
import type { useListeningTimers } from "./useListeningTimers";
type Params = {
  untimed?: boolean;
  timers: ReturnType<typeof useListeningTimers>;
  listeningSettings: ListeningSettings;
  currentQuestion: ListeningQuestion;
  speak: (text: string, options?: { pronunciation?: string }) => void;
  stopPlayback: () => void;
  clearCanvas: () => void;
  listenPhase: ListenPhase;
  listenIndex: number;
  listenExitOpen: boolean;
  audioLoading: boolean;
  secondsLeft: number;
  questionDuration: number;
  setSecondsLeft: StateSetter<number>;
  setListenPhase: StateSetter<ListenPhase>;
  setPlayCount: StateSetter<number>;
  setListenMessage: StateSetter<string>;
};
export function useListeningPlayback({
  untimed = false,
  timers,
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
}: Params) {
  const {
    timerRef,
    answerTimeoutRef,
    repeatTimeoutRef,
    repeatRemainingRef,
    autoRepeatEnabledRef,
    playbackEndedRef,
    clearAnswerTimers,
    clearListenTimers,
  } = timers;
  useEffect(() => {
    playbackEndedRef.current = () => {
      if (!autoRepeatEnabledRef.current || repeatRemainingRef.current <= 0) return;
      const nextPlay = listeningSettings.repeatCount - repeatRemainingRef.current + 1;
      setListenMessage(`等待重播。`);
      repeatTimeoutRef.current = window.setTimeout(() => {
        repeatTimeoutRef.current = null;
        if (!autoRepeatEnabledRef.current || repeatRemainingRef.current <= 0) return;
        repeatRemainingRef.current -= 1;
        setPlayCount((current) => current + 1);
        setListenMessage(`第 ${nextPlay} 次播放。`);
        speak(currentQuestion.audioText, { pronunciation: currentQuestion.answer });
      }, listeningSettings.intervalSeconds * 1000);
    };
  }, [
    listeningSettings,
    currentQuestion.audioText,
    currentQuestion.answer,
    speak,
    playbackEndedRef,
    autoRepeatEnabledRef,
    repeatRemainingRef,
    repeatTimeoutRef,
    setListenMessage,
    setPlayCount,
  ]);

  const finishListening = useCallback(
    (early = false) => {
      clearListenTimers();
      stopPlayback();
      setSecondsLeft(0);
      setListenPhase("review");
      setListenMessage(early ? "已交卷。" : "時間到。");
    },
    [clearListenTimers, stopPlayback, setSecondsLeft, setListenPhase, setListenMessage],
  );

  const remainingSeconds = useEffectEvent(() => secondsLeft);
  useEffect(() => {
    if (
      untimed ||
      listenExitOpen ||
      audioLoading ||
      (listenPhase !== "active" && listenPhase !== "retry")
    )
      return;

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    const timeUp = window.setTimeout(() => finishListening(), remainingSeconds() * 1000);
    answerTimeoutRef.current = [timeUp];

    return clearAnswerTimers;
  }, [
    untimed,
    clearAnswerTimers,
    finishListening,
    listenIndex,
    listenPhase,
    questionDuration,
    listenExitOpen,
    audioLoading,
    timerRef,
    answerTimeoutRef,
    setSecondsLeft,
  ]);

  useEffect(
    () => () => {
      clearListenTimers();
      stopPlayback();
    },
    [clearListenTimers, stopPlayback, setSecondsLeft, setListenPhase, setListenMessage],
  );

  const resumeListening = () => {
    repeatRemainingRef.current = listeningSettings.repeatCount - 1;
    autoRepeatEnabledRef.current = true;
  };

  const startListening = () => {
    repeatRemainingRef.current = listeningSettings.repeatCount - 1;
    autoRepeatEnabledRef.current = true;
    setListenPhase("active");
    setSecondsLeft(questionDuration);
    setPlayCount(1);
    clearCanvas();
    setListenMessage("播放中。");
    speak(currentQuestion.audioText, { pronunciation: currentQuestion.answer });
  };

  const startRetryWriting = () => {
    repeatRemainingRef.current = listeningSettings.repeatCount - 1;
    autoRepeatEnabledRef.current = true;
    clearCanvas();
    setListenPhase("retry");
    setSecondsLeft(questionDuration);
    setPlayCount((current) => current + 1);
    setListenMessage("請重新作答。");
    speak(currentQuestion.audioText, { pronunciation: currentQuestion.answer });
  };

  const replayQuestion = () => {
    setPlayCount((current) => current + 1);
    speak(currentQuestion.audioText, { pronunciation: currentQuestion.answer });
  };

  return { finishListening, startListening, startRetryWriting, replayQuestion, resumeListening };
}
