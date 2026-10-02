import { maxRecordingSeconds } from "./custom-audio";

type Callbacks = {
  status: (status: "waiting" | "recording" | "processing") => void;
  ready: (blob: Blob) => void;
  error: (error: unknown) => void;
};
type Dependencies = {
  getStream: () => Promise<MediaStream>;
  makeRecorder: (stream: MediaStream) => MediaRecorder;
};

export function makeBrowserRecorder(stream: MediaStream): MediaRecorder {
  if (typeof MediaRecorder === "undefined")
    throw new Error("這個瀏覽器不支援錄音，請匯入音檔或使用新版瀏覽器。");
  const mimeType = [
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ].find((type) => MediaRecorder.isTypeSupported(type));
  return new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
}

/** Owns microphone lifetime, including permission arriving after cancellation. */
export function createRecordingSession(callbacks: Callbacks, dependencies?: Dependencies) {
  let generation = 0;
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let limit: ReturnType<typeof setTimeout> | undefined;
  let permissionLimit: ReturnType<typeof setTimeout> | undefined;
  const release = () => {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  };
  const cancel = () => {
    generation += 1;
    clearTimeout(limit);
    clearTimeout(permissionLimit);
    if (recorder?.state === "recording") recorder.stop();
    recorder = null;
    release();
  };
  const stop = () => {
    if (recorder?.state !== "recording") return;
    clearTimeout(limit);
    callbacks.status("processing");
    recorder.stop();
    release();
  };
  const start = async () => {
    cancel();
    const token = generation;
    callbacks.status("waiting");
    permissionLimit = setTimeout(() => {
      if (token !== generation) return;
      cancel();
      callbacks.error(new Error("還沒取得麥克風權限。請允許權限後再按一次，或匯入音檔。"));
    }, 25000);
    try {
      if (!dependencies && !navigator.mediaDevices?.getUserMedia)
        throw new Error("這個瀏覽器無法開啟麥克風，請匯入音檔或使用 HTTPS 網站。");
      const nextStream = await (dependencies?.getStream() ??
        navigator.mediaDevices.getUserMedia({ audio: true }));
      if (token !== generation) {
        nextStream.getTracks().forEach((track) => track.stop());
        return;
      }
      clearTimeout(permissionLimit);
      stream = nextStream;
      const nextRecorder = dependencies
        ? dependencies.makeRecorder(stream)
        : makeBrowserRecorder(stream);
      recorder = nextRecorder;
      const chunks: Blob[] = [];
      nextRecorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      nextRecorder.onerror = () => {
        if (token !== generation) return;
        cancel();
        callbacks.error(new Error("錄音中斷，請重新錄製。"));
      };
      nextRecorder.onstop = () => {
        if (token !== generation) return;
        release();
        recorder = null;
        callbacks.ready(
          new Blob(chunks, { type: nextRecorder.mimeType || chunks[0]?.type || "audio/webm" }),
        );
      };
      nextRecorder.start();
      callbacks.status("recording");
      limit = setTimeout(stop, maxRecordingSeconds * 1000);
    } catch (error) {
      if (token !== generation) return;
      cancel();
      callbacks.error(error);
    }
  };
  return { start, stop, cancel };
}

/** Decode without playing; metadata duration is often Infinity in recorder WebM files. */
export async function audioDuration(blob: Blob): Promise<number> {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    return decoded.duration;
  } catch {
    throw new Error("這個音檔無法讀取，請重新錄製，或改用 M4A、MP3、WAV。");
  } finally {
    await context.close();
  }
}
