"use client";
import { useCallback, useRef } from "react";

/** One owner for the answer clock, delayed repetitions, and playback-end callbacks. */
export function useListeningTimers() {
  const timerRef = useRef<number | null>(null);
  const answerTimeoutRef = useRef<number[]>([]);
  const repeatTimeoutRef = useRef<number | null>(null);
  const repeatRemainingRef = useRef(0);
  const autoRepeatEnabledRef = useRef(false);
  const playbackEndedRef = useRef<() => void>(() => {});
  const clearAnswerTimers = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    answerTimeoutRef.current.forEach((id) => window.clearTimeout(id));
    answerTimeoutRef.current = [];
  }, []);
  const onStopRepeat = useCallback(() => {
    if (repeatTimeoutRef.current !== null) window.clearTimeout(repeatTimeoutRef.current);
    repeatTimeoutRef.current = null;
  }, []);
  const clearListenTimers = useCallback(() => {
    clearAnswerTimers();
    onStopRepeat();
    repeatRemainingRef.current = 0;
    autoRepeatEnabledRef.current = false;
  }, [clearAnswerTimers, onStopRepeat]);
  return {
    timerRef,
    answerTimeoutRef,
    repeatTimeoutRef,
    repeatRemainingRef,
    autoRepeatEnabledRef,
    playbackEndedRef,
    clearAnswerTimers,
    clearListenTimers,
    onStopRepeat,
  };
}
