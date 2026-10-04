export const maxRecordingSeconds = 20;
export const maxRecordingBytes = 2 * 1024 * 1024;

export type RecordingIdentity = { text: string; pronunciation: string };
export type RecordingInfo = RecordingIdentity & {
  key: string;
  mimeType: string;
  duration: number;
  updatedAt: number;
};
export type CustomRecording = RecordingInfo & { blob: Blob };

/** Tone marks and syllable boundaries are part of the identity, not just the character. */
export function recordingKey(text: string, pronunciation: string): string {
  return JSON.stringify([text.trim(), pronunciation.trim()]);
}

export function validateAudio(blob: Blob, duration: number): void {
  if (!blob.size) throw new Error("音檔是空的，請重新錄製。");
  if (blob.size > maxRecordingBytes) throw new Error("音檔太大，請使用 2 MB 以下的檔案。");
  if (!blob.type.startsWith("audio/"))
    throw new Error("請選擇音訊檔案，例如 M4A、MP3、WAV 或 WebM。");
  if (!Number.isFinite(duration) || duration < 0.2 || duration > maxRecordingSeconds + 0.5)
    throw new Error(`請使用 0.2 至 ${maxRecordingSeconds} 秒的讀音。`);
}

export function validateRecording(recording: CustomRecording): void {
  const { text, pronunciation, key, blob, duration, updatedAt } = recording;
  if (
    !text ||
    !pronunciation ||
    key !== recordingKey(text, pronunciation) ||
    !Number.isFinite(updatedAt)
  )
    throw new Error("錄音資料不完整，請重新錄製。");
  if (!(blob instanceof Blob)) throw new Error("錄音資料無法讀取，請重新錄製。");
  validateAudio(blob, duration);
}

/** Custom recordings never fall back to a synthetic voice, nor get slowed down. */
export function clipPolicy(custom: boolean, symbol: boolean, requestedRate?: number) {
  return {
    playbackRate: custom ? 1 : (requestedRate ?? (1)),
    allowSynthesis: !custom && !symbol,
  };
}

export function recordingError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError")
      return "未開啟麥克風權限。可以到瀏覽器設定允許，或匯入音檔。";
    if (error.name === "NotFoundError") return "找不到麥克風，請連接麥克風或匯入音檔。";
    if (error.name === "NotReadableError") return "麥克風可能正被其他程式使用，請稍後再試。";
    if (error.name === "QuotaExceededError")
      return "裝置儲存空間不足。請先備份錄音，再移除不需要的錄音。";
  }
  return error instanceof Error ? error.message : "錄音無法完成，請再試一次。";
}
