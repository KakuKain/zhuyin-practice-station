"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { recordingError, type CustomRecording, type RecordingInfo } from "./custom-audio";
import { createRecordingCache } from "./recording-cache";
import { customAudioStorage } from "./custom-audio-storage";

export function useCustomRecordings() {
  const [cache] = useState(() => createRecordingCache(customAudioStorage));
  const [recordings, setRecordings] = useState<RecordingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const load = useCallback(async () => {
    const token = ++generation.current;
    try {
      const next = await cache.list();
      if (token !== generation.current) return;
      setRecordings(next);
      setError("");
    } catch (cause) {
      if (token === generation.current) setError(recordingError(cause));
    } finally {
      if (token === generation.current) setLoading(false);
    }
  }, [cache]);
  const reload = useCallback(async () => {
    cache.invalidate();
    setLoading(true);
    await load();
  }, [load, cache]);
  useEffect(() => {
    const token = ++generation.current;
    void cache
      .list()
      .then((next) => {
        if (token !== generation.current) return;
        setRecordings(next);
        setError("");
        setLoading(false);
      })
      .catch((cause) => {
        if (token !== generation.current) return;
        setError(recordingError(cause));
        setLoading(false);
      });
    return () => {
      generation.current += 1;
    };
  }, [cache]);
  const save = useCallback(
    async (recording: CustomRecording) => {
      await customAudioStorage.put(recording);
      cache.saved(recording);
      const { key, text, pronunciation, mimeType, duration, updatedAt } = recording;
      setRecordings((current) => [
        ...current.filter((item) => item.key !== key),
        { key, text, pronunciation, mimeType, duration, updatedAt },
      ]);
      setError("");
    },
    [cache],
  );
  const remove = useCallback(
    async (key: string) => {
      await customAudioStorage.remove(key);
      cache.removed(key);
      setRecordings((current) => current.filter((item) => item.key !== key));
    },
    [cache],
  );
  return { recordings, loading, error, reload, save, remove, get: cache.get };
}
export type CustomAudioController = ReturnType<typeof useCustomRecordings>;
