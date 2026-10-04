"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { recordingError, type CustomRecording, type RecordingInfo } from "./custom-audio";
import { customAudioStorage } from "./custom-audio-storage";

export function useCustomRecordings() {
  const [recordings, setRecordings] = useState<RecordingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const load = useCallback(async () => {
    const token = ++generation.current;
    try {
      const next = await customAudioStorage.list();
      if (token !== generation.current) return;
      setRecordings(next);
      setError("");
    } catch (cause) {
      if (token === generation.current) setError(recordingError(cause));
    } finally {
      if (token === generation.current) setLoading(false);
    }
  }, []);
  const reload = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);
  useEffect(() => {
    const token = ++generation.current;
    void customAudioStorage
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
  }, []);
  const save = useCallback(async (recording: CustomRecording) => {
    await customAudioStorage.put(recording);
    const { key, text, pronunciation, mimeType, duration, updatedAt } = recording;
    setRecordings((current) => [
      ...current.filter((item) => item.key !== key),
      { key, text, pronunciation, mimeType, duration, updatedAt },
    ]);
    setError("");
  }, []);
  const remove = useCallback(async (key: string) => {
    await customAudioStorage.remove(key);
    setRecordings((current) => current.filter((item) => item.key !== key));
  }, []);
  return { recordings, loading, error, reload, save, remove, get: customAudioStorage.get };
}
export type CustomAudioController = ReturnType<typeof useCustomRecordings>;
