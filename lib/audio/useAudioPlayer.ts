"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { ListeningQuestion, StateSetter, View } from "../../features/types";
import { registeredAudioUrl } from "./audio-registry";
import { createAudioPreloader } from "./audio-preload";
import { clipPolicy, type CustomRecording } from "./custom-audio";
import {
  listeningAudioUrl,
  dictationAudioUrl,
  audioTailDelayMs,
} from "../../features/listening/listening-data";
type Options = {
  view: View;
  lessonSymbols: readonly string[];
  sessionQuestions: ListeningQuestion[];
  playbackEndedRef: RefObject<() => void>;
  setPracticeNotice: StateSetter<string>;
  onStopRepeat: () => void;
  getCustomRecording: (text: string, pronunciation: string) => Promise<CustomRecording | null>;
};
export type ClipOptions = {
  url?: string;
  pronunciation?: string;
  allowSynthesis?: boolean;
  onStarted?: () => void;
  onEnded?: () => void;
  /** Callers that pass onError show their own message; no page-wide notice is added. */
  onError?: () => void;
};
export function useAudioPlayer({
  view,
  lessonSymbols,
  sessionQuestions,
  playbackEndedRef,
  setPracticeNotice,
  onStopRepeat,
  getCustomRecording,
}: Options) {
  const [playingSymbol, setPlayingSymbol] = useState<string | null>(null);

  const [audioError, setAudioError] = useState(false);

  const [audioLoading, setAudioLoading] = useState(false);

  const playbackRef = useRef<HTMLAudioElement>(null);

  const audioPreloaderRef = useRef<ReturnType<typeof createAudioPreloader> | null>(null);

  const playbackTailTimeoutRef = useRef<number | null>(null);

  const playbackTokenRef = useRef(0);
  const audioLoadTimeoutRef = useRef<number | null>(null);
  const clipEndedRef = useRef<(() => void) | null>(null);
  const customUrlRef = useRef<string | null>(null);

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
    if (view !== "lesson" && view !== "symbols") return;
    void document.fonts.load('400 48px "KidLessonYoOnly"').catch(() => {});
    // Lesson clips can be prepared together; the chart warms only visible buttons.
    if (view === "lesson") audioPreloaderRef.current?.warm(lessonSymbols.map(listeningAudioUrl));
  }, [view, lessonSymbols]);

  // The chart is a lazy chunk, so it reports its visible buttons itself once mounted.
  const warmSymbols = useCallback((texts: readonly string[]) => {
    audioPreloaderRef.current?.warm(texts.map(listeningAudioUrl));
  }, []);

  useEffect(() => {
    if (view !== "listen") return;
    audioPreloaderRef.current?.warm(
      sessionQuestions.map((question) => dictationAudioUrl(question.audioText)),
    );
  }, [view, sessionQuestions]);

  const stopPlayback = useCallback(() => {
    playbackTokenRef.current += 1;
    clipEndedRef.current = null;
    if (audioLoadTimeoutRef.current !== null) window.clearTimeout(audioLoadTimeoutRef.current);
    audioLoadTimeoutRef.current = null;
    onStopRepeat();
    if (playbackTailTimeoutRef.current !== null)
      window.clearTimeout(playbackTailTimeoutRef.current);
    playbackTailTimeoutRef.current = null;
    const audio = playbackRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (customUrlRef.current) URL.revokeObjectURL(customUrlRef.current);
    customUrlRef.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setPlayingSymbol(null);
    setAudioLoading(false);
    setAudioError(false);
  }, [onStopRepeat]);

  const finishPlayback = useCallback(() => {
    const playbackToken = playbackTokenRef.current;
    setPlayingSymbol(null);
    setAudioLoading(false);
    if (customUrlRef.current) URL.revokeObjectURL(customUrlRef.current);
    customUrlRef.current = null;
    const onEnded = clipEndedRef.current;
    clipEndedRef.current = null;
    onEnded?.();
    if (playbackTailTimeoutRef.current !== null)
      window.clearTimeout(playbackTailTimeoutRef.current);
    playbackTailTimeoutRef.current = window.setTimeout(() => {
      playbackTailTimeoutRef.current = null;
      if (playbackToken === playbackTokenRef.current) playbackEndedRef.current();
    }, audioTailDelayMs);
  }, [playbackEndedRef]);

  const speak = useCallback(
    (text: string, options: ClipOptions = {}) => {
      const notify = (message: string) => {
        if (view === "practice" && !options.onError) setPracticeNotice(message);
      };
      const audio = playbackRef.current;
      if (!audio) {
        setAudioError(true);
        options.onError?.();
        notify("音訊無法播放，請重新整理後再試。");
        return;
      }
      stopPlayback();
      clipEndedRef.current = options.onEnded ?? null;
      const playbackToken = playbackTokenRef.current;
      setAudioError(false);
      setAudioLoading(true);
      const loaded = () => {
        if (playbackToken !== playbackTokenRef.current) return;
        if (audioLoadTimeoutRef.current !== null) window.clearTimeout(audioLoadTimeoutRef.current);
        audioLoadTimeoutRef.current = null;
        setAudioLoading(false);
      };
      const failed = () => {
        if (playbackToken !== playbackTokenRef.current) return;
        stopPlayback();
        setAudioError(true);
        options.onError?.();
        notify("音訊尚未準備好，請檢查網路後再播放。");
      };
      audioLoadTimeoutRef.current = window.setTimeout(failed, 15000);
      const isZhuyinPrompt = /^[\u3105-\u3129]+$/.test(text);
      setPlayingSymbol(isZhuyinPrompt || options.url ? text : null);
      const start = async () => {
        // A known custom recording that fails to load rejects here instead of quietly
        // substituting the old voice; an unavailable recording database resolves to null.
        const custom =
          !options.url && (isZhuyinPrompt || options.pronunciation)
            ? await getCustomRecording(text, options.pronunciation ?? text)
            : null;
        if (playbackToken !== playbackTokenRef.current) return;
        const policy = clipPolicy(!!custom, isZhuyinPrompt);
        const url =
          options.url ??
          registeredAudioUrl(text, options.pronunciation) ??
          (registeredAudioUrl(text) ? null : dictationAudioUrl(text));
        if (!custom && !url) {
          failed();
          return;
        }
        const playbackUrl = url ?? "";
        audio.dataset.clipText = text;
        audioPreloaderRef.current?.cancelWarmup(playbackUrl);
        if (custom) {
          customUrlRef.current = URL.createObjectURL(custom.blob);
          audio.src = customUrlRef.current;
        } else audio.src = audioPreloaderRef.current?.playbackUrl(playbackUrl) ?? playbackUrl;
        // Assigning src resets the rate, so normal speed is set afterwards.
        audio.defaultPlaybackRate = 1;
        audio.playbackRate = 1;
        audio.preservesPitch = true;
        (audio as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch =
          true;
        await audio
          .play()
          .then(() => {
            if (playbackToken !== playbackTokenRef.current) return;
            loaded();
            options.onStarted?.();
            // Retain downloaded official clips for subsequent taps and replay.
            if (!custom) audioPreloaderRef.current?.warm([playbackUrl]);
          })
          .catch(() => {
            if (playbackToken !== playbackTokenRef.current) return;
            if (
              !policy.allowSynthesis ||
              options.allowSynthesis === false ||
              registeredAudioUrl(text) !== null
            ) {
              loaded();
              setPlayingSymbol(null);
              setAudioLoading(false);
              setAudioError(true);
              options.onError?.();
              notify(
                custom
                  ? "自訂錄音無法播放，請到「更多 → 自訂讀音」重新錄製。"
                  : "注音讀音無法播放，請重新整理後再試。",
              );
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
              utterance.onstart = () => {
                if (playbackToken !== playbackTokenRef.current) return;
                loaded();
                options.onStarted?.();
              };
              utterance.onerror = failed;
              window.speechSynthesis.speak(utterance);
            } else {
              loaded();
              setAudioLoading(false);
              setAudioError(true);
              options.onError?.();
              notify("音訊無法播放，請檢查音量或網路後再試。");
            }
          });
      };
      void start().catch(failed);
    },
    [finishPlayback, stopPlayback, view, setPracticeNotice, getCustomRecording],
  );

  const playPreviewSymbol = (symbol: string) => {
    speak(symbol);
  };
  // Navigation cancels both the audio and stale play promises / repeat callbacks.
  useEffect(() => () => stopPlayback(), [view, stopPlayback]);
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
    warmSymbols,
  };
}
