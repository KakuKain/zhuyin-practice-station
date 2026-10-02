"use client";
import { useCallback, useEffect, useState } from "react";
import { recordingError, type CustomRecording, type RecordingInfo } from "./custom-audio";
import { customAudioStorage } from "./custom-audio-storage";

export function useCustomRecordings() {
  const [recordings, setRecordings] = useState<RecordingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRecordings(await customAudioStorage.list());
      setError("");
    } catch (cause) {
      setError(recordingError(cause));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
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
