"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { ListeningQuestion, StateSetter, View } from "../../features/types";
import { createAudioPreloader } from "./audio-preload";
import {
  listeningAudioUrl,
  audioPlaybackRate,
  zhuyinPlaybackRate,
  audioTailDelayMs,
} from "../../features/listening/listening-data";
type Options = {
  view: View;
  lessonSymbols: readonly string[];
  sessionQuestions: ListeningQuestion[];
  playbackEndedRef: RefObject<() => void>;
  setPracticeNotice: StateSetter<string>;
  onStopRepeat: () => void;
};
export function useAudioPlayer({
  view,
  lessonSymbols,
  sessionQuestions,
  playbackEndedRef,
  setPracticeNotice,
  onStopRepeat,
}: Options) {
  const [playingSymbol, setPlayingSymbol] = useState<string | null>(null);

  const [audioError, setAudioError] = useState(false);

  const [audioLoading, setAudioLoading] = useState(false);

  const playbackRef = useRef<HTMLAudioElement>(null);

  const audioPreloaderRef = useRef<ReturnType<typeof createAudioPreloader> | null>(null);

  const playbackTailTimeoutRef = useRef<number | null>(null);

  const playbackTokenRef = useRef(0);

  useEffect(() => {
    // Recreate the cache during React's development effect replay as well.
    const preloader = createAudioPreloader();
    audioPreloaderRef.current = preloader;
    return () => {
      preloader.dispose();
      if (audioPreloaderRef.current === preloader) audioPreloaderRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (view !== "lesson") return;
    void document.fonts.load('400 48px "KidLessonYoOnly"').catch(() => {});
    audioPreloaderRef.current?.warm(lessonSymbols.map(listeningAudioUrl));
  }, [view, lessonSymbols]);

  useEffect(() => {
    if (view !== "listen") return;
    audioPreloaderRef.current?.warm(
      sessionQuestions.map((question) => listeningAudioUrl(question.audioText)),
    );
  }, [view, sessionQuestions]);

  const stopPlayback = useCallback(() => {
    playbackTokenRef.current += 1;
    onStopRepeat();
    if (playbackTailTimeoutRef.current !== null)
      window.clearTimeout(playbackTailTimeoutRef.current);
    playbackTailTimeoutRef.current = null;
    const audio = playbackRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setAudioLoading(false);
  }, [onStopRepeat]);

  const finishPlayback = useCallback(() => {
    const playbackToken = playbackTokenRef.current;
    setPlayingSymbol(null);
    setAudioLoading(false);
    if (playbackTailTimeoutRef.current !== null)
      window.clearTimeout(playbackTailTimeoutRef.current);
    playbackTailTimeoutRef.current = window.setTimeout(() => {
      playbackTailTimeoutRef.current = null;
      if (playbackToken === playbackTokenRef.current) playbackEndedRef.current();
    }, audioTailDelayMs);
  }, [playbackEndedRef]);

  const speak = useCallback(
    (text: string) => {
      const audio = playbackRef.current;
      if (!audio) {
        setAudioError(true);
        if (view === "practice") setPracticeNotice("音訊無法播放，請重新整理後再試。");
        return;
      }
      stopPlayback();
      const playbackToken = playbackTokenRef.current;
      setAudioError(false);
      setAudioLoading(view === "listen");
      const isZhuyinPrompt = /^[\u3105-\u3129]+$/.test(text);
      // Keep one natural reading per clip; the listening timer controls repeats.
      // Symbols stay at normal speed; only generated character/word clips are slower.
      audio.playbackRate = isZhuyinPrompt ? zhuyinPlaybackRate : audioPlaybackRate;
      audio.preservesPitch = true;
      (audio as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = true;
      const url = listeningAudioUrl(text);
      audio.src = audioPreloaderRef.current?.playbackUrl(url) ?? url;
      audio
        .play()
        .then(() => {
          if (playbackToken === playbackTokenRef.current) setAudioLoading(false);
        })
        .catch(() => {
          if (playbackToken !== playbackTokenRef.current) return;
          if (isZhuyinPrompt) {
            setAudioLoading(false);
            setAudioError(true);
            if (view === "practice") setPracticeNotice("注音讀音無法播放，請重新整理後再試。");
            return;
          }
          if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "zh-TW";
            utterance.rate = 0.68;
            utterance.onend = () => {
              if (playbackToken === playbackTokenRef.current) {
                finishPlayback();
              }
            };
            utterance.onstart = () => setAudioLoading(false);
            window.speechSynthesis.speak(utterance);
          } else {
            setAudioLoading(false);
            setAudioError(true);
            if (view === "practice") setPracticeNotice("音訊無法播放，請檢查音量或網路後再試。");
          }
        });
    },
    [finishPlayback, stopPlayback, view, setPracticeNotice],
  );

  const playPreviewSymbol = (symbol: string) => {
    onStopRepeat();
    setPlayingSymbol(symbol);
    speak(symbol);
  };
  useEffect(() => () => stopPlayback(), [stopPlayback]);
  return {
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
  };
}
