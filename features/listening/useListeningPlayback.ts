"use client";
import { useCallback, useEffect, useEffectEvent } from "react";
import type { ListenPhase, ListeningQuestion, ListeningSettings, StateSetter } from "../types";
import type { useListeningTimers } from "./useListeningTimers";
type Params = {
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
      setListenMessage(
        `等待 ${listeningSettings.intervalSeconds} 秒後播放第 ${nextPlay} 次，可以繼續寫。`,
      );
      repeatTimeoutRef.current = window.setTimeout(() => {
        repeatTimeoutRef.current = null;
        if (!autoRepeatEnabledRef.current || repeatRemainingRef.current <= 0) return;
        repeatRemainingRef.current -= 1;
        setPlayCount((current) => current + 1);
        setListenMessage(`第 ${nextPlay} 次播放中，可以繼續寫。`);
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
      setListenMessage(early ? "已交卷，請家長一起看看。" : "時間到，請把平板交給家長一起看看。");
    },
    [clearListenTimers, stopPlayback, setSecondsLeft, setListenPhase, setListenMessage],
  );

  const remainingSeconds = useEffectEvent(() => secondsLeft);
  useEffect(() => {
    if (listenExitOpen || audioLoading || (listenPhase !== "active" && listenPhase !== "retry"))
      return;

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    const timeUp = window.setTimeout(() => finishListening(), remainingSeconds() * 1000);
    answerTimeoutRef.current = [timeUp];

    return clearAnswerTimers;
  }, [
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

  const startListening = () => {
    repeatRemainingRef.current = listeningSettings.repeatCount - 1;
    autoRepeatEnabledRef.current = true;
    setListenPhase("active");
    setSecondsLeft(questionDuration);
    setPlayCount(1);
    clearCanvas();
    setListenMessage("第一次播放中，Canvas 已開放，可以邊聽邊寫。 ");
    speak(currentQuestion.audioText, { pronunciation: currentQuestion.answer });
  };

  const startRetryWriting = () => {
    repeatRemainingRef.current = listeningSettings.repeatCount - 1;
    autoRepeatEnabledRef.current = true;
    clearCanvas();
    setListenPhase("retry");
    setSecondsLeft(questionDuration);
    setPlayCount((current) => current + 1);
    setListenMessage("題目正在播放，請重新寫一次；需要時可按重播。 ");
    speak(currentQuestion.audioText, { pronunciation: currentQuestion.answer });
  };

  const replayQuestion = () => {
    setPlayCount((current) => current + 1);
    speak(currentQuestion.audioText, { pronunciation: currentQuestion.answer });
  };

  return { finishListening, startListening, startRetryWriting, replayQuestion };
}
